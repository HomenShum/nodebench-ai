#!/usr/bin/env npx tsx

/**
 * PubMed Ground Truth Fetcher
 * 
 * Fetches academic papers and abstracts from NCBI PubMed for academic
 * evaluation scenarios.
 * 
 * Usage:
 *   npx tsx scripts/fetch-pubmed-ground-truth.ts --term "CRISPR 2024"
 *   npx tsx scripts/fetch-pubmed-ground-truth.ts --pmid 37500000 37499999
 *   npx tsx scripts/fetch-pubmed-ground-truth.ts --output docs/architecture/benchmarks/pubmed-ground-truth.json
 */

import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

dotenv.config();

interface PubMedArticle {
  pmid: string;
  doi?: string;
  title: string;
  authors: string[];
  abstract: string;
  journal: string;
  pubDate: string;
  meshTerms?: string[];
  keywords?: string[];
}

interface PubMedSearchResult {
  idList: string[];
  count: number;
  translationSet?: Record<string, string>;
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function getMultiArg(flag: string): string[] {
  const result: string[] = [];
  let idx = process.argv.indexOf(flag);
  while (idx >= 0) {
    if (idx + 1 < process.argv.length && !process.argv[idx + 1].startsWith("-")) {
      result.push(process.argv[idx + 1]);
    }
    idx = process.argv.indexOf(flag, idx + 1);
  }
  return result;
}

async function searchPubMed(term: string, maxResults: number = 10): Promise<PubMedSearchResult> {
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("term", term);
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retmax", maxResults.toString());
  searchUrl.searchParams.set("sort", "relevance");

  const response = await fetch(searchUrl.toString());
  
  if (!response.ok) {
    throw new Error(`PubMed search error: ${response.status}`);
  }
  
  const data = await response.json() as any;
  const esearchResult = data.esearchresult || {};
  
  return {
    idList: esearchResult.idlist || [],
    count: parseInt(esearchResult.count || "0", 10),
  };
}

async function fetchPubMedArticles(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  
  const fetchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
  fetchUrl.searchParams.set("db", "pubmed");
  fetchUrl.searchParams.set("id", pmids.join(","));
  fetchUrl.searchParams.set("retmode", "json");
  fetchUrl.searchParams.set("rettype", "abstract");

  const response = await fetch(fetchUrl.toString());
  
  if (!response.ok) {
    throw new Error(`PubMed fetch error: ${response.status}`);
  }
  
  const data = await response.json() as any;
  const articles = data.result || {};
  const results: PubMedArticle[] = [];
  
  // Skip the first one (it's a placeholder with 'uids')
  for (const pmid of pmids) {
    const article = articles[pmid];
    if (!article || article.error) continue;
    
    const authors = article.authors?.map((a: any) => {
      const name = a.name || "";
      const initials = a.initials || "";
      return `${name} ${initials}`.trim();
    }).filter(Boolean) || [];
    
    results.push({
      pmid,
      doi: article.doi || "",
      title: article.title || "",
      authors,
      abstract: article.abstract || "",
      journal: article.source || "",
      pubDate: article.pubdate || "",
      meshTerms: article.meshheading?.map((m: any) => m.descriptor?.name).filter(Boolean) || [],
      keywords: article.keyword?.filter(Boolean) || [],
    });
  }
  
  return results;
}

async function searchByDateRange(term: string, years: number = 2, maxResults: number = 10): Promise<PubMedArticle[]> {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - years;
  const dateFilter = `${startYear}:${currentYear}[DP]`; // Date of Publication
  
  const searchResult = await searchPubMed(`${term} AND ${dateFilter}`, maxResults);
  
  if (searchResult.idList.length === 0) {
    console.log(`  [WARN] No results found for: ${term}`);
    return [];
  }
  
  return fetchPubMedArticles(searchResult.idList);
}

async function main() {
  const outputPath = getArg("--output") || "docs/architecture/benchmarks/pubmed-ground-truth.json";
  const pmidsFromArgs = getMultiArg("--pmid");
  const termFromArgs = getArg("--term");
  const searchByDate = process.argv.includes("--recent");
  const maxResults = parseInt(getArg("--max") || "10", 10);
  
  const results: Record<string, PubMedArticle> = {};
  
  if (pmidsFromArgs.length > 0) {
    console.log(`Fetching ${pmidsFromArgs.length} specific PMIDs...`);
    const articles = await fetchPubMedArticles(pmidsFromArgs);
    for (const article of articles) {
      results[article.pmid] = article;
    }
  } else if (termFromArgs) {
    console.log(`Searching for: "${termFromArgs}"...`);
    if (searchByDate) {
      const articles = await searchByDateRange(termFromArgs, 2, maxResults);
      for (const article of articles) {
        results[article.pmid] = article;
      }
    } else {
      const searchResult = await searchPubMed(termFromArgs, maxResults);
      console.log(`  Found ${searchResult.count} total results, fetching top ${searchResult.idList.length}`);
      const articles = await fetchPubMedArticles(searchResult.idList);
      for (const article of articles) {
        results[article.pmid] = article;
      }
    }
  } else {
    // Default search terms for evaluation scenarios
    const defaultTerms = [
      "CRISPR gene editing 2024",
      "mRNA vaccine technology",
      "CAR-T cell therapy",
      "Alzheimer's disease mechanism",
      "cancer immunotherapy checkpoint",
    ];
    
    console.log(`Fetching default evaluation papers (${defaultTerms.length} topics)...`);
    for (const term of defaultTerms) {
      console.log(`  Searching: ${term}...`);
      const articles = await searchByDateRange(term, 2, 2);
      for (const article of articles) {
        results[article.pmid] = article;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  const output = {
    generatedAt: new Date().toISOString(),
    source: "NCBI PubMed",
    sourceUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    articles: results,
  };
  
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${Object.keys(results).length} papers to ${outputPath}`);
}

main().catch(console.error);
