const CUSTOM_DOMAIN = 'example.com';
const NOTION_USER = 'foobar'
const NOTION_DOMAIN = NOTION_USER + '.notion.site';
const ROOT_PAGE_ID = '17e5421c2e0b808c93a0d418d22abcde';

// SEO
const PAGE_TITLE = "Victor's Website";
const PAGE_DESCRIPTION = "My website";
const PAGE_AUTHOR = 'Victor';
const PAGE_FAVICON = 'https://example.com/favicon.ico';
const PAGE_COVER = 'https://example.com/cover.png';

// sitemap pages
const SITEMAP = [
  '',
  // 'Hello-world-ccdf3f6004dc407cb8a15926f590f600',
  // 'Lorem-Ipsum-cc5ba04fa0494a37cd8937b16e7f6a38',
  // 'about-us',
];

/*
 * Enter your URL slug to page ID mapping
 * The key on the left is the slug (without the slash)
 * The value on the right is the Notion page ID
 */
const ALIAS_TO_ID = {
  '': ROOT_PAGE_ID,
};

// Google Font https://fonts.google.com
const GOOGLE_FONT = 'Roboto';

// Customize the page with CSS
const CUSTOM_CSS = /*css*/`
  div.notion-topbar > div > div:nth-child(3) { display: none !important; }
  div.notion-topbar > div > div:nth-child(4) { display: none !important; }
  div.notion-topbar > div > div:nth-child(5) { display: none !important; }
  div.notion-topbar > div > div:nth-child(6) { display: none !important; }
  div.notion-topbar > div > div:nth-child(7) { display: none !important; }
  div.notion-topbar-mobile > div:nth-child(3) { display: none !important; }
  div.notion-topbar-mobile > div:nth-child(4) { display: none !important; }
  div.notion-topbar > div > div:nth-child(1n).toggle-mode { display: block !important; }
  div.notion-topbar-mobile > div:nth-child(1n).toggle-mode { display: block !important; }
`;

// Custom HTML on the head of the page
// Load external resources
const CUSTOM_HTML_HEAD = /*html*/`
  <!-- CUSTOM HTML -->
`;

// Custom HTML on the body of the page
// Load external resources
const CUSTOM_HTML_BODY = /*html*/`

`;

// Replace texts.
const replace_dict = {
  'FOOBAR': 'HELLOWORLD',
}

/********************* CONFIGURATION ENDS HERE *********************/

const ID_TO_ALIAS = Object.fromEntries(Object.entries(ALIAS_TO_ID).map(([key, val]) => ([val, key])));

addEventListener('fetch', event => {
  event.respondWith(proxy(event.request));
});

async function proxy(request) {
  if (request.method === 'OPTIONS') {
    if (request.headers.get('Origin') && request.headers.get('Access-Control-Request-Method') && request.headers.get('Access-Control-Request-Headers')) {
      // Handle CORS pre-flight request.
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } else {
      // Handle standard OPTIONS request.
      return new Response(null, {
        headers: {
          'Allow': 'GET, HEAD, POST, PUT, OPTIONS',
        }
      });
    }
  }

  let url = new URL(request.url);
  url.hostname = NOTION_DOMAIN;

  if (url.pathname === '/robots.txt') {
    return new Response(`
      User-agent: *
      Allow: /

      Sitemap: https://${CUSTOM_DOMAIN}/sitemap.xml
      `.replace(/^ +/gm, ''));
  }

  if (url.pathname.endsWith('favicon.ico') || url.pathname.endsWith('favicon.png')) {
    return Response.redirect(PAGE_FAVICON, 301);
  }

  if (url.pathname === '/sitemap.xml') {
    const sitemapEntries = SITEMAP.map(slug => `  <url><loc>https://${CUSTOM_DOMAIN}/${slug}</loc></url>`).join('\n');
    const siteMap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}</urlset>`;
    const response = new Response(siteMap);
    response.headers.set('content-type', 'application/xml');
    return response;
  }

  let response;
  if (url.pathname.startsWith('/app') && url.pathname.endsWith('js')) {
    response = await fetch(url.toString());
    let body = await response.text();
    body = body.replace(/www.notion.so/g, CUSTOM_DOMAIN).replace(/notion.so/g, CUSTOM_DOMAIN);
    body = body.replace(/www.notion.site/g, CUSTOM_DOMAIN).replace(/notion.site/g, CUSTOM_DOMAIN);
    // body = body.replaceAll(NOTION_DOMAIN, CUSTOM_DOMAIN);
    // body = await replace_response_text(body, request, response, url);
    response = new Response(body, response);
    response.headers.set('Content-Type', 'application/x-javascript');
    return response;
  }
  // API
  else if ((url.pathname.startsWith('/api'))) {
    // "Continue to external site" error.
    // if (url.pathname.startsWith('/api/v3/getPublicPageData')) return new Response();

    // Forward API
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
      },
      body: url.pathname.startsWith('/api/v3/getPublicPageData') ? null : request.body,
    });

    let body;
    if (response.headers.get('Content-Type')?.match(/application\/json|text\/html/)) {
      body = await response.text();
      body = await replace_response_text(body, request, response, url);
    }

    response = new Response(body || response.body, response);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }

  // Javascript files
  else if (url.pathname.endsWith(".js")) {
    response = await fetch(url.toString());

    let body;
    body = await response.text();
    body = await replace_response_text(body, request, response, url);

    response = new Response(body || response.body, response);
    response.headers.set("Content-Type", "application/x-javascript");
    return response;
  }

  // Redirect aliases to pageIds
  else if (ALIAS_TO_ID[url.pathname.slice(1)] !== undefined) {
    const pageId = ALIAS_TO_ID[url.pathname.slice(1)];
    const redirectDomain = new URL(request.url).hostname;
    return Response.redirect('https://' + redirectDomain + '/' + pageId, 307);
  }
  else if (url.pathname.startsWith("/primus-v8")) {
    url.hostname = "msgstore.www.notion.so";
    response = await fetch(url.toString(), {
      body: request.body,
      headers: request.headers,
      method: request.method,
    });
    response = new Response(response.body, response);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set("Content-Type", "text/plain; charset=UTF-8");
    return response;
  }
  else {
    response = await fetch(url.toString(), {
      body: request.body,
      headers: request.headers,
      method: request.method,
    });

    let body;
    if (response.headers.get('Content-Type')?.match(/application\/json|text\/html/)) {
      body = await response.text();
      body = await replace_response_text(body, request, response, url);
    }

    response = new Response(body || response.body, response);
    response.headers.delete('Content-Security-Policy');
    response.headers.delete('X-Content-Security-Policy');
  }

  return modifyPage(response, ALIAS_TO_ID);
}


async function replace_response_text(body, request, response, url) {
  let text = body;
  for (let [search, replace] of Object.entries(replace_dict)) {
    let re = new RegExp(search, 'g');
    text = text.replace(re, replace);
  }
  text = text.replace(/%CURRENTURL%/g, encodeURIComponent(request.headers.get('Referer')));
  return text;
}

class HeadRewriter {
  element(element) {
    element.prepend(patchHead, { html: true });
    element.prepend(metadata, { html: true });

    if (GOOGLE_FONT) {
      element.append(`
        <link href='https://fonts.googleapis.com/css?family=${GOOGLE_FONT.replace(/ /g, '+')}:Regular,Bold,Italic&display=swap' rel='stylesheet'>
        <style>* { font-family: "${GOOGLE_FONT}" !important; }</style>
        `, { html: true });
    }
    element.append(`<style>${CUSTOM_CSS}</style>\n`, { html: true });
    element.append(CUSTOM_HTML_HEAD, { html: true });
  }
}

class BodyRewriter {
  element(element) {
    element.append(CUSTOM_HTML_BODY, { html: true });
    element.append(patchBody, { html: true });
  }
}

class MetaRewriter {
  element(element) {
    // <meta property="og:site_name" content="Victor's Notion on Notion">
    // <meta name="article:author" content="Victor">
    // <meta name="twitter:image" content="https://vitim.notion.site/images/meta/builtWithNotion.png">
    // <meta property="og:image" content="https://www.notion.so/images/meta/default.png"></meta>

    // Title
    if (PAGE_TITLE && element.tagName === 'title') element.setInnerContent(PAGE_TITLE);
    if (PAGE_TITLE && element.getAttribute('property') === 'og:title' || element.getAttribute('name') === 'twitter:title' || element.getAttribute('property') === 'og:site_name') element.setAttribute('content', PAGE_TITLE);
    // Description
    if (element.getAttribute('name') === 'description' || element.getAttribute('property') === 'og:description' || element.getAttribute('name') === 'twitter:description') element.setAttribute('content', PAGE_DESCRIPTION);
    if (element.getAttribute('property') === 'og:url' || element.getAttribute('name') === 'twitter:url') element.setAttribute('content', CUSTOM_DOMAIN);
    if (PAGE_AUTHOR && element.getAttribute('article:author')) element.setAttribute('content', PAGE_AUTHOR);
    // Notion social
    if (element.getAttribute('name') === 'apple-itunes-app') element.remove();
    if (element.getAttribute('name') === 'twitter:site') element.remove();
    // Cover
    if (element.getAttribute('content')?.endsWith('builtWithNotion.png') || element.getAttribute('content') === 'https://www.notion.so/images/meta/default.png') {
      if (PAGE_COVER) element.setAttribute('content', PAGE_COVER);
      else element.remove();
    }
  }
}

class LinkRewriter {
  element(element) {
    // <link rel="shortcut icon" href="https://vitim.notion.site/images/favicon.ico"/>
    if (element.getAttribute('rel') === 'apple-touch-icon') element.remove();
    if (element.getAttribute('rel') === 'shortcut icon' && element.getAttribute('href')?.endsWith('notion.site/images/favicon.ico')) {
      if (PAGE_FAVICON) element.setAttribute('href', PAGE_FAVICON);
      else element.remove();
    }
  }
}

async function modifyPage(res, ALIAS_TO_ID) {
  return new HTMLRewriter()
    .on('head', new HeadRewriter())
    .on('title', new MetaRewriter())
    .on('meta', new MetaRewriter())
    .on('link', new LinkRewriter())
    .on('body', new BodyRewriter())
    .transform(res);
}

// Client side injected js

var metadata = /*html*/`
<script>
  const _PREFIX = '[NOTIONFLARE]';
  const CUSTOM_DOMAIN = "${CUSTOM_DOMAIN}";
  const NOTION_DOMAIN = "${NOTION_DOMAIN}";
  const NOTION_USER = "${NOTION_USER}";
  const ALIAS_TO_ID = ${JSON.stringify(ALIAS_TO_ID, null, 0)};
  const ID_TO_ALIAS = Object.fromEntries(Object.entries(ALIAS_TO_ID).map(([key, val]) => ([val, key])));
</script>
`;

var patchHead = /*html*/`
<script>
  function getPageId() {
    return location.pathname.slice(-32);
  }
  function getSlug() {
    return location.pathname.slice(1);
  }

  function updateSlug() {
    const alias = ID_TO_ALIAS[getPageId()];
    if (alias !== undefined) {
      console.log(_PREFIX, 'updateSlug replacing pageId with alias', { pageId: getPageId(), alias });
      history.replaceState(history.state, '', '/' + alias);
    } else {
      console.log(_PREFIX, 'updateSlug no alias found for pageId', { pageId: getPageId(), alias });
    }
  }

  const onpopstate = window.onpopstate;
  window.onpopstate = function onpopstateHandler() {
    console.log(_PREFIX, 'onpopstate', arguments);
    const pageId = ALIAS_TO_ID[getSlug()];
    if (pageId !== undefined) {
      console.log(_PREFIX, 'replacing alias back to pageId with bypass', pageId, getSlug());
      history.replaceState_(history.state, 'bypass', '/' + pageId);
    }
    // This line throws an exception, but it works for some expectations.
    onpopstate.apply(this, [].slice.call(arguments));
    updateSlug();
  };

  // patch replaceState to prevent alias from being replaced with pageId
  window.history.replaceState_ = window.history.replaceState;
  window.history.replaceState = function replaceState_patched(state, unused, url) {
    console.log(_PREFIX, 'replaceState', { state, unused, url, prevented: ALIAS_TO_ID[getSlug()] !== undefined, arguments });
    if (ALIAS_TO_ID[getSlug()] !== undefined) return; // is aliased page, do nothing
    url = url.replace(NOTION_USER + "/", "");
    return window.history.replaceState_.apply(window.history, arguments);
  };

  // patch pushState to replace pageId with alias
  window.history.pushState_ = window.history.pushState;
  window.history.pushState = function pushState_patched(state, unused, url) {
    const dest = new URL(location.protocol + location.host + url);
    const pageId = dest.pathname.slice(-32);
    if (ID_TO_ALIAS[pageId]) url = '/' + ID_TO_ALIAS[pageId]; // replace pageId with alias if found
    else url = '/' + pageId;
    console.log(_PREFIX, 'pushState', { state, unused, url, dest, pageId, alias: ID_TO_ALIAS[pageId] });
    return window.history.pushState_.apply(window.history, [state, unused, url]);
  };

  // patch XMLHttpRequest to replace custom domain with notion domain
  const open = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open_ = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function open_patched(method, url) {
    arguments[1] = arguments[1].replace(CUSTOM_DOMAIN, NOTION_DOMAIN);
    arguments[1] = arguments[1].replace("msgstore.www.notion.so", CUSTOM_DOMAIN);
    // console.log(_PREFIX, 'XMLHttpRequest.open', {method, url}, arguments);
    return open.apply(this, [].slice.call(arguments));
  };


  const observer = new MutationObserver(function () {
    const nav = document.querySelector('.notion-topbar');
    const mobileNav = document.querySelector('.notion-topbar-mobile');
    if (nav && nav.firstChild && nav.firstChild.firstChild || mobileNav && mobileNav.firstChild) {
      console.log(_PREFIX, "Mutation observer triggered");
      updateSlug();
      observer.disconnect();
      if (nav.firstChild.children.length >= 3)
        nav.firstChild.children[2].remove();
    }
  });

</script>
`;

var patchBody = /*html*/`
<script>
  localStorage.__console = true;

  if (window.CONFIG) window.CONFIG.domainBaseUrl = "https://" + CUSTOM_DOMAIN;
  // if (window.CONFIG) window.CONFIG.publicDomainName = CUSTOM_DOMAIN;

  const notionApp = document.querySelector('#notion-app');
  if (notionApp) {
    observer.observe(notionApp, {
      childList: true,
      subtree: true,
    });
  }
  else console.error(_PREFIX, 'Could not find notion app!');
</script>
`;
