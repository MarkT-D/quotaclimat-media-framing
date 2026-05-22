"use client";
import { useState, useEffect } from "react";
import type { Article } from "./articleTypes";

let _cache: Article[] | null = null;
let _promise: Promise<Article[]> | null = null;

function fetchArticles(): Promise<Article[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = fetch("/api/articles")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Article[]>;
    })
    .then((data) => {
      _cache = data;
      _promise = null;
      return data;
    });
  return _promise;
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache) return;
    fetchArticles()
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  return { articles, loading, error };
}
