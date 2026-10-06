"use client";
import { useEffect } from "react";
import { useLoadingStore } from "@/lib/store/loading";
export default function HomeClient() {
  const setLoading = useLoadingStore((s) => s.setLoading);
  useEffect(() => {
    setLoading(false);
  }, [setLoading]);
  return null;
}