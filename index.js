// Based on https://developers.cloudflare.com/workers/tutorials/configure-your-cdn

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});

const CLOUD_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image`;

async function serveAsset(event) {
  try {
    const url = new URL(event.request.url);
    const cache = caches.default;
    let response = await cache.match(event.request);

    if (!response) {
      const cloudinaryURL = `${CLOUD_URL}${url.pathname}`;

      // Only pass necessary headers
      const headers = new Headers({
        Accept: event.request.headers.get("Accept"),
        "Accept-Encoding": event.request.headers.get("Accept-Encoding"),
        "User-Agent": event.request.headers.get("User-Agent"),
      });

      response = await fetch(cloudinaryURL, {
        headers,
        cf: {
          cacheEverything: true,
        },
      });

      // Check for zero-length responses
      if (
        response.ok &&
        parseInt(response.headers.get("content-length")) === 0
      ) {
        console.error("Received zero-length response, retrying without cache");
        // Retry the fetch without cache
        response = await fetch(cloudinaryURL, {
          headers,
          cf: {
            cacheEverything: false, // Bypass cache
          },
        });

        // If still zero-length, throw error
        if (
          response.ok &&
          parseInt(response.headers.get("content-length")) === 0
        ) {
          throw new Error("Received zero-length response after retry");
        }
      }

      // Validate response
      if (!response.ok) {
        throw new Error(
          `Cloudinary responded with ${response.status}: ${response.statusText}`
        );
      }

      // Validate content type
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("image/")) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Set cache headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set(
        "cache-control",
        `public, max-age=14400, stale-while-revalidate=3600`
      );
      responseHeaders.set("vary", "Accept");

      // Ensure content-type is set
      if (!responseHeaders.has("content-type")) {
        responseHeaders.set("content-type", "image/jpeg"); // or detect from pathname
      }

      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

      // Only cache valid responses
      if (response.ok && parseInt(response.headers.get("content-length")) > 0) {
        console.log("✅:", url.pathname);
        event.waitUntil(cache.put(event.request, response.clone()));
      }
    } else {
      // For cached responses, still check content-length
      if (parseInt(response.headers.get("content-length")) === 0) {
        // If cached response is zero-length, fetch fresh
        const cloudinaryURL = `${CLOUD_URL}${
          new URL(event.request.url).pathname
        }`;
        response = await fetch(cloudinaryURL, {
          headers: new Headers({
            Accept: event.request.headers.get("Accept"),
            "Accept-Encoding": event.request.headers.get("Accept-Encoding"),
            "User-Agent": event.request.headers.get("User-Agent"),
          }),
          cf: {
            cacheEverything: false, // Bypass cache
          },
        });

        // Update cache headers
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set(
          "cache-control",
          `public, max-age=14400, stale-while-revalidate=3600`
        );
        responseHeaders.set("vary", "Accept");

        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });

        // Update cache if response is valid
        if (
          response.ok &&
          parseInt(response.headers.get("content-length")) > 0
        ) {
          event.waitUntil(cache.put(event.request, response.clone()));
        }
      }

      console.log("📦:", url.pathname);
    }

    return response;
  } catch (error) {
    console.error("Error serving asset:", error);

    // Log the error details
    console.error({
      url: event.request.url,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    if (error.message.includes("404")) {
      return new Response("Image not found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=7200", // Cache 404s for 2 hours (7200 seconds)
        },
      });
    }

    // Return a more helpful error response
    return new Response(`Image loading error: ${error.message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "X-Error-Message": error.message,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}

async function handleRequest(event) {
  if (event.request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "no-store",
      },
    });
  }

  return serveAsset(event);
}
