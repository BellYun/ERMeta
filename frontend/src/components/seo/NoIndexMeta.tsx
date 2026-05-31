"use client";

import { useEffect } from "react";

const ROBOTS_CONTENT = "noindex,nofollow,noarchive";

function upsertMeta(name: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const previous = element?.content ?? null;
  const created = !element;

  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }

  element.content = ROBOTS_CONTENT;

  return () => {
    if (created) {
      element?.remove();
      return;
    }
    if (element && previous !== null) {
      element.content = previous;
    }
  };
}

export function NoIndexMeta() {
  useEffect(() => {
    const cleanupRobots = upsertMeta("robots");
    const cleanupGooglebot = upsertMeta("googlebot");

    return () => {
      cleanupRobots();
      cleanupGooglebot();
    };
  }, []);

  return null;
}
