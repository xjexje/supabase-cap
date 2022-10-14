import { readBody, assertMethod, defineEventHandler } from "h3";
import { CapacitorCookies } from '@capacitor/core';
import { useRuntimeConfig } from "#imports";
const config = useRuntimeConfig().public;
export default defineEventHandler(async (event) => {
  assertMethod(event, "POST");
  const body = await readBody(event);
  const cookieOptions = config.supabase.cookies;
  const { event: signEvent, session } = body;
  if (!event) {
    throw new Error("Auth event missing!");
  }
  if (signEvent === "SIGNED_IN") {
    if (!session) {
      throw new Error("Auth session missing!");
    }
    /*setCookie(
      event,
      `${cookieOptions.name}-access-token`,
      session.access_token,
      {
        domain: cookieOptions.domain,
        maxAge: cookieOptions.lifetime ?? 0,
        path: cookieOptions.path,
        sameSite: cookieOptions.sameSite
      }
    ); */
    CapacitorCookies.setCookie({
      url: cookieOptions.domain,
      key: `${cookieOptions.name}-access-token`,
      value: session.access_token,
    });
  }
  if (signEvent === "SIGNED_OUT") {
    /*setCookie(
      event,
      `${cookieOptions.name}-access-token`,
      "",
      {
        maxAge: -1,
        path: cookieOptions.path
      }
    ); */
    CapacitorCookies.clearAllCookies();
  }
  return "auth cookie set";
});
