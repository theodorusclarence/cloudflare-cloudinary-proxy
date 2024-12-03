# Cloudflare Workers × Cloudinary Cache + Proxy

Use this to:

1. Add a custom domain to your Cloudinary account
2. Cache your images, so you don't run up your Cloudinary bandwidth

This is made for Cloudinary, but should work for any CDN. For instance, you can proxy Backblaze B2 files with Cloudflare. The bandwidth between the two is free, so you are really only paying Backblaze to hold onto your assets.

## Setup

1. Rename `wrangler.toml.example` to `wrangler.toml`
2. In `wrangler.toml`, fill in the Account ID and Zone ID found on your cloudflare domain name main page.
3. Fill in your Cloudinary cloud name in the environmental variables in `wrangler.toml`
4. In Cloudflare, add a sub-domain DNS Record that will handle your images, like `images.yourdomain.com`. Set this to type: `AAAA`, name: `images`, content: `100::`
5. Change `route = "images.yourdomain.com/*"` in `wranglerfile.toml` to match your domain.
6. Deploy the sucker with:

- `wrangler publish` to test it. This will run it on wrangler.dev
- `wrangler publish --env production` to push to your custom domain

If you haven't already, install wrangler on your machine with `npm i @cloudflare/wrangler -g`. Don't pop a sudo in front, it doesn't work. You can login with `wrangler login`.

## To use

Say you have a URL that looks like this:

```
https://res.cloudinary.com/theodorusclarence/image/upload/q_1,f_auto,e_blur:1000,c_fill,ar_5:3,w_1440/theodorusclarence/banner/gabor-kozmon-u04ZPsnxeb4-unsplash_in1fe4
```

Replace the `res.cloudinary.com/wesbos/image` part with `images.yourdomain.com/CLOUDNAME`.

So mine looks like this:

`https://images.theodorusclarence.com/upload/q_1,f_auto,e_blur:1000,c_fill,ar_5:3,w_1440/theodorusclarence/banner/gabor-kozmon-u04ZPsnxeb4-unsplash_in1fe4`

This should still work with all the fetching, and URL transforms.

You can verify that your images are being cached by looking for the `cf-cache-status HIT` response header in your dev tools network tab. This will only show up the second time you request it.
