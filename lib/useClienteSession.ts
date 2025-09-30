"use client";
import { useEffect, useState } from "react";
import { getSession } from "./session";

export function useClientSession() {
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(getSession());   // lee localStorage solo en cliente
    setLoaded(true);
  }, []);

  return { session, loaded };
}
