import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface MockRow {
  [key: string]: unknown;
}

// In-memory tables for offline / unit-test development with placeholder credentials
const mockTables: Record<string, MockRow[]> = {
  modules: [],
  questions: [],
};

/**
 * Resets the in-memory mock database tables (useful for unit test isolation).
 */
export function resetMockDatabase() {
  mockTables.modules = [];
  mockTables.questions = [];
}

/**
 * Creates a mock fetch function that handles PostgREST REST endpoints in-memory
 * when connecting to placeholder Supabase URLs during offline testing.
 */
function createMockPostgrestFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const urlObj = new URL(urlStr);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\/rest\/v1\/([a-zA-Z0-9_-]+)/);

    if (!match) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tableName = match[1];
    if (!mockTables[tableName]) {
      mockTables[tableName] = [];
    }

    const method = (init?.method || "GET").toUpperCase();
    const currentRows = mockTables[tableName];

    // Handle filter parameters (e.g., id=eq.xxx or module_id=eq.xxx)
    const filters: Array<{ key: string; value: string }> = [];
    for (const [key, val] of urlObj.searchParams.entries()) {
      if (val.startsWith("eq.")) {
        filters.push({ key, value: val.slice(3) });
      }
    }

    const filteredRows = currentRows.filter((row) => {
      for (const filter of filters) {
        if (String(row[filter.key]) !== filter.value) {
          return false;
        }
      }
      return true;
    });

    // Handle ordering
    const orderParam = urlObj.searchParams.get("order");
    if (orderParam) {
      const [col, dir] = orderParam.split(".");
      filteredRows.sort((a, b) => {
        const valA = a[col] ? String(a[col]) : "";
        const valB = b[col] ? String(b[col]) : "";
        if (dir === "desc") {
          return valB.localeCompare(valA);
        }
        return valA.localeCompare(valB);
      });
    }

    const headers = new Headers(init?.headers);
    const accept = headers.get("Accept") || headers.get("accept") || "";

    if (method === "GET") {
      if (accept.includes("vnd.pgrst.object+json")) {
        if (filteredRows.length === 0) {
          return new Response(
            JSON.stringify({
              code: "PGRST116",
              details: "The result contains 0 rows",
              message: "JSON object requested, multiple (or no) rows returned",
            }),
            {
              status: 406,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify(filteredRows[0]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(filteredRows), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "content-range": `0-${filteredRows.length}/${filteredRows.length}`,
        },
      });
    }

    if (method === "POST") {
      let body: unknown = {};
      if (init?.body) {
        try {
          body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        } catch {
          body = {};
        }
      }

      const items: Record<string, unknown>[] = Array.isArray(body)
        ? (body as Record<string, unknown>[])
        : [body as Record<string, unknown>];

      const inserted = items.map((item) => {
        const row: MockRow = {
          id: (typeof item.id === "string" ? item.id : undefined) || crypto.randomUUID(),
          created_at: (typeof item.created_at === "string" ? item.created_at : undefined) || new Date().toISOString(),
          ...item,
        };
        mockTables[tableName].push(row);
        return row;
      });

      if (accept.includes("vnd.pgrst.object+json") || (headers.get("Prefer") || "").includes("return=representation")) {
        const resultPayload = Array.isArray(body) ? inserted : (inserted[0] || {});
        return new Response(JSON.stringify(resultPayload), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(inserted), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "PATCH") {
      let body: Record<string, unknown> = {};
      if (init?.body) {
        try {
          body = typeof init.body === "string" ? JSON.parse(init.body) : (init.body as unknown as Record<string, unknown>);
        } catch {
          body = {};
        }
      }

      for (const row of filteredRows) {
        Object.assign(row, body);
      }

      return new Response(JSON.stringify(filteredRows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      const deletedIds = new Set(filteredRows.map((r) => r.id));
      mockTables[tableName] = mockTables[tableName].filter((r) => !deletedIds.has(r.id));

      // Cascade delete questions if modules are deleted
      if (tableName === "modules") {
        mockTables.questions = mockTables.questions.filter((q) => !deletedIds.has(q.module_id));
      }

      return new Response(JSON.stringify(filteredRows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Method ${method} not implemented` }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  };
}

/**
 * Creates a Supabase admin client with Service Role privileges.
 * Bypasses Row Level Security (RLS) for server-side persistence, route handlers,
 * and cross-device module synchronization.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-role-key";

  const isPlaceholderUrl = supabaseUrl.includes("placeholder-project.supabase.co");

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(isPlaceholderUrl
      ? {
          global: {
            fetch: createMockPostgrestFetch(),
          },
        }
      : {}),
  });
}
