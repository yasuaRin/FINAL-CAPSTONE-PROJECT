INSERT INTO brands (name, slug) VALUES
  ('Yves Rocher', 'yves-rocher'),
  ('Verites', 'verites'),
  ('Specs', 'specs'),
  ('Rollover', 'rollover'),
  ('Remington', 'remington'),
  ('Piero', 'piero'),
  ('Minimalist x Vidhelp', 'minimalist-x-vidhelp'),
  ('Mineral Botanical', 'mineral-botanical'),
  ('Fisik Sport', 'fisik-sport'),
  ('C&F', 'c-and-f'),
  ('Beeme', 'beeme');
ON CONFLICT DO NOTHING;

-- Sample hosts
INSERT INTO hosts (name) VALUES
  ('ARRA'), ('ZAHRA'), ('MIA'), ('CINDY'), ('MENTARI')
ON CONFLICT DO NOTHING;