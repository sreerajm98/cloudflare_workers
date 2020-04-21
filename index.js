addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

// Source: https://developers.cloudflare.com/workers/templates/pages/cookie_extract/
// This function is used to extract the cookie from the header.
function getCookie(request, name) {
  let result = null;
  let cookieString = request.headers.get('Cookie');
  if (cookieString) {
    let cookies = cookieString.split(';');
    cookies.forEach(cookie => {
      let cookieName = cookie.split('=')[0].trim();
      if (cookieName === name) {
        let cookieVal = cookie.split('=')[1];
        result = cookieVal;
      }
    })
  }
  return result;
}

// Source: https://developers.cloudflare.com/workers/reference/apis/html-rewriter/
// This function allows you to customize the items in a page.
class ElementHandler {
  element(element) {
    if (element.tagName === 'title') {
      element.setInnerContent("My Variant")
    }
    else if (element.tagName === 'h1' && element.getAttribute("id") === 'title') {
      element.setInnerContent("Modified Variant")
    }
    else if (element.tagName === 'p' && element.getAttribute("id") === 'description') {
      element.setInnerContent("This variant contains a link to my Github profile")
    }
    else if (element.tagName === 'a' && element.getAttribute("id") === 'url') {
      element.setAttribute("href", "https://github.com/sreerajm98")
      element.setInnerContent("Go to Sreeraj's Github")
    }
  }
}

// Source: https://itnext.io/error-handling-with-async-await-in-js-26c3f20bc06a
// This function is used to check for any errors with await.
const checkFetchError = (promise) => {
  return promise
      .then(data => {
        return data;
      })
      .catch(error => {
        return 'Error'
      });
};

/**
 * Respond with variant html
 * @param {Request} request
 */
async function handleRequest(request) {

  // Send a fetch request to the given url to get a url array.
  let urlArr = await checkFetchError(fetchRequest('https://cfw-takehome.developers.workers.dev/api/variants'));
  console.log(urlArr);
  if (urlArr  === 'Error') {
    return new Response('An internal error occurred. (001)', {
      headers: { 'content-type': 'text/plain' },
      status: 500,
      statusText: 'Internal Server Error'
    })
  }

  let cookie = getCookie(request, 'variant');
  if (!cookie) {
    const selected = Math.random() < 0.5 ? 0 : 1;
    cookie = urlArr[selected];
  }

  // Send a fetch request for the persisting variant.
  let response = await checkFetchError(fetchPersisting(cookie));
  if (response === 'Error') {
    return new Response('An internal error occurred. (002)', {
      headers: { 'content-type': 'text/plain' },
      status: 500,
      statusText: 'Internal Server Error'
    })
  }

  // Modify the page using HTMLRewriter.
  let modifiedResponse  = await checkFetchError(new HTMLRewriter()
      .on('*', new ElementHandler()).transform(response).text());
  if (modifiedResponse === 'Error') {
    return new Response('An internal error occurred. (003)', {
      headers: { 'content-type': 'text/plain' },
      status: 500,
      statusText: 'Internal Server Error'
    })
  }

  return new Response(modifiedResponse, {
    headers: {
      'content-type': 'text/html',
      'Set-Cookie': `variant=${cookie};`
    },
  })
}

// Function to handle fetch request.
async function fetchRequest(url) {
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
      .then(response => {
        return response.json()
      })
      .then(data => {
        return data['variants']
      })
      .catch(error => {
        reject(error);
      })
}

// Function to handle fetch request for persisting variants.
async function fetchPersisting(url) {
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
      .then(response => {
        return response
      })
      .catch(error => {
        reject(error);
      })
}



