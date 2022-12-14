import { fileURLToPath } from 'url';
import { defu } from 'defu';
import { defineNuxtModule, createResolver, addPlugin, addServerHandler, addTemplate, extendViteConfig, resolveModule } from '@nuxt/kit';

const module = defineNuxtModule({
  meta: {
    name: "@nuxtjs/supabase",
    configKey: "supabase",
    compatibility: {
      nuxt: "^3.0.0-rc.8"
    }
  },
  defaults: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    client: {},
    cookies: {
      name: "sb",
      lifetime: 60 * 60 * 8,
      domain: "",
      path: "/",
      sameSite: "lax"
    }
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const resolveRuntimeModule = (path) => resolveModule(path, { paths: resolve("./runtime") });
    if (!options.url) {
      console.warn("Missing `SUPABASE_URL` in `.env`");
    }
    if (!options.key) {
      console.warn("Missing `SUPABASE_KEY` in `.env`");
    }
    nuxt.options.runtimeConfig.public.supabase = defu(nuxt.options.runtimeConfig.public.supabase, {
      url: options.url,
      key: options.key,
      client: options.client,
      cookies: options.cookies
    });
    nuxt.options.runtimeConfig.supabase = defu(nuxt.options.runtimeConfig.supabase, {
      serviceKey: options.serviceKey
    });
    const runtimeDir = fileURLToPath(new URL("./runtime", import.meta.url));
    nuxt.options.build.transpile.push(runtimeDir);
    nuxt.options.build.transpile.push(
      "@supabase/functions-js",
      "@supabase/gotrue-js",
      "@supabase/postgrest-js",
      "@supabase/realtime-js",
      "@supabase/storage-js",
      "@supabase/supabase-js"
    );
    addPlugin(resolve(runtimeDir, "plugins", "supabase.server"));
    addPlugin(resolve(runtimeDir, "plugins", "supabase.client"));
    addServerHandler({
      route: "/api/_supabase/session",
      handler: resolve(runtimeDir, "server/api/session")
    });
    nuxt.hook("imports:dirs", (dirs) => {
      dirs.push(resolve(runtimeDir, "composables"));
    });
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias = nitroConfig.alias || {};
      nitroConfig.externals = defu(typeof nitroConfig.externals === "object" ? nitroConfig.externals : {}, {
        inline: [resolve("./runtime")]
      });
      nitroConfig.alias["#supabase/server"] = resolveRuntimeModule("./server/services");
    });
    addTemplate({
      filename: "types/supabase.d.ts",
      getContents: () => [
        "declare module '#supabase/server' {",
        `  const serverSupabaseClient: typeof import('${resolve("./runtime/server/services")}').serverSupabaseClient`,
        `  const serverSupabaseServiceRole: typeof import('${resolve("./runtime/server/services")}').serverSupabaseServiceRole`,
        `  const serverSupabaseUser: typeof import('${resolve("./runtime/server/services")}').serverSupabaseUser`,
        "}"
      ].join("\n")
    });
    nuxt.hook("prepare:types", (options2) => {
      options2.references.push({ path: resolve(nuxt.options.buildDir, "types/supabase.d.ts") });
    });
    extendViteConfig((config) => {
      config.optimizeDeps = config.optimizeDeps || {};
      config.optimizeDeps.include = config.optimizeDeps.include || [];
      config.optimizeDeps.include.push("cross-fetch");
    });
    if (nuxt.options.dev) {
      extendViteConfig((config) => {
        config.optimizeDeps = config.optimizeDeps || {};
        config.optimizeDeps.include = config.optimizeDeps.include || [];
        config.optimizeDeps.include.push("websocket");
      });
    } else if (!["cloudflare"].includes(process.env.NITRO_PRESET)) {
      nuxt.options.build.transpile.push("websocket");
    }
  }
});

export { module as default };
