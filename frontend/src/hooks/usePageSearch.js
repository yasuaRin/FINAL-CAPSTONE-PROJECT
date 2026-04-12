import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePageSearch
 * Browser Ctrl+F style — highlights all matches, tracks current index,
 * supports next/prev navigation between matches.
 * Returns: { matchCount, currentMatch, goNext, goPrev, clearHighlights }
 */
export const usePageSearch = (query, containerRef) => {
  const [matchCount, setMatchCount]       = useState(0);
  const [currentMatch, setCurrentMatch]   = useState(0); // 1-based
  const markNodesRef                      = useRef([]);   // all <mark> elements

  const scrollToMatch = useCallback((index, marks) => {
    const list = marks || markNodesRef.current;
    if (!list.length) return;

    // Remove "active" highlight from previous
    list.forEach(m => {
      m.style.background = '#FEF08A';
      m.style.outline    = 'none';
    });

    // Highlight active match in a deeper amber
    const active = list[index];
    if (active) {
      active.style.background = '#F59E0B';
      active.style.outline    = '2px solid #D97706';
      active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const clearHighlights = useCallback(() => {
    markNodesRef.current.forEach(mark => {
      if (mark.parentNode) {
        mark.parentNode.replaceChild(
          document.createTextNode(mark.textContent),
          mark
        );
      }
    });
    markNodesRef.current = [];
    setMatchCount(0);
    setCurrentMatch(0);
  }, []);

  // Re-highlight whenever query changes
  useEffect(() => {
    clearHighlights();

    const q = query.trim();
    if (!q || q.length < 2 || !containerRef?.current) return;

    const container  = containerRef.current;
    const lowerQ     = q.toLowerCase();
    const newMarks   = [];

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement?.tagName?.toLowerCase();
          if (['script', 'style', 'input', 'textarea', 'mark'].includes(tag))
            return NodeFilter.FILTER_REJECT;
          if (node.textContent.toLowerCase().includes(lowerQ))
            return NodeFilter.FILTER_ACCEPT;
          return NodeFilter.FILTER_SKIP;
        },
      }
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(textNode => {
      const text      = textNode.textContent;
      const lowerText = text.toLowerCase();
      const fragment  = document.createDocumentFragment();
      let lastIndex   = 0;
      let idx;

      while ((idx = lowerText.indexOf(lowerQ, lastIndex)) !== -1) {
        if (idx > lastIndex)
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, idx)));

        const mark = document.createElement('mark');
        mark.textContent  = text.slice(idx, idx + q.length);
        mark.style.cssText =
          'background:#FEF08A;color:#1a1a1a;border-radius:3px;padding:0 2px;transition:background 0.15s;';
        fragment.appendChild(mark);
        newMarks.push(mark);
        lastIndex = idx + q.length;
      }

      if (lastIndex < text.length)
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));

      textNode.parentNode.replaceChild(fragment, textNode);
    });

    markNodesRef.current = newMarks;
    setMatchCount(newMarks.length);

    if (newMarks.length > 0) {
      setCurrentMatch(1);
      scrollToMatch(0, newMarks);
    }
  }, [query, containerRef]);

  const goNext = useCallback(() => {
    if (!markNodesRef.current.length) return;
    setCurrentMatch(prev => {
      const next = prev >= markNodesRef.current.length ? 1 : prev + 1;
      scrollToMatch(next - 1, markNodesRef.current);
      return next;
    });
  }, [scrollToMatch]);

  const goPrev = useCallback(() => {
    if (!markNodesRef.current.length) return;
    setCurrentMatch(prev => {
      const prevIdx = prev <= 1 ? markNodesRef.current.length : prev - 1;
      scrollToMatch(prevIdx - 1, markNodesRef.current);
      return prevIdx;
    });
  }, [scrollToMatch]);

  return { matchCount, currentMatch, goNext, goPrev, clearHighlights };
};