import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  for (let i = 0; i < 32; i++) {
    secret += chars[bytes[i] % 32];
  }
  return secret;
}

function base32Decode(str: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const output = new Uint8Array(Math.floor((str.length * 5) / 8));
  let index = 0;
  for (let i = 0; i < str.length; i++) {
    value = (value << 5) | chars.indexOf(str[i]);
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output;
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

async function generateTOTP(secret: string, window = 0): Promise<string> {
  const key = base32Decode(secret.toUpperCase().replace(/=+$/, ""));
  const counter = Math.floor(Date.now() / 1000 / 30) + window;
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigInt64(0, BigInt(counter));
  const hash = await hmacSha1(key, new Uint8Array(buf));
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) | (hash[offset+1] << 16) | (hash[offset+2] << 8) | hash[offset+3];
  return String(code % 1000000).padStart(6, "0");
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (let w = -4; w <= 4; w++) {
    const expected = await generateTOTP(secret, w);
    if (expected === token) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;
    const totpCode = body.token;

    if (action === "generate") {
      // Check if secret already exists — reuse it instead of generating a new one
      const { data: existing } = await supabase
        .from("totp_secrets")
        .select("secret")
        .eq("user_id", user.id)
        .single();

      const secret = existing?.secret || generateSecret();
      const otpauth_url = `otpauth://totp/VidHelp:${encodeURIComponent(user.email!)}?secret=${secret}&issuer=VidHelp&algorithm=SHA1&digits=6&period=30`;

      // Only insert if no existing secret
      if (!existing) {
        await supabase.from("totp_secrets").insert({ user_id: user.id, secret, verified: false });
      }

      return new Response(JSON.stringify({ secret, otpauth_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enable" || action === "disable") {
      const { data: totpData } = await supabase
        .from("totp_secrets").select("secret").eq("user_id", user.id).single();

      if (!totpData) return new Response(JSON.stringify({ error: "No secret found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

      const isValid = await verifyTOTP(totpData.secret, totpCode);

      if (!isValid) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "enable") {
        await supabase.from("totp_secrets").update({ verified: true }).eq("user_id", user.id);
        await supabase.from("admins").update({ totp_enabled: true }).eq("id", user.id);
      } else {
        // On disable, delete the secret so a fresh one is generated next time
        await supabase.from("totp_secrets").delete().eq("user_id", user.id);
        await supabase.from("admins").update({ totp_enabled: false }).eq("id", user.id);
      }

      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});