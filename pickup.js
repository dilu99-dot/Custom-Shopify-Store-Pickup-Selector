const modal = document.getElementById("pickup-modal");
const openBtn = document.getElementById("open-pickup-modal");
const closeBtn = document.getElementById("close-pickup");
const results = document.getElementById("store-results");
const confirmBtn = document.getElementById("confirm-pickup");

let selectedLocation = null;

function getVariantId(){
  const numericId = document.querySelector('[name="id"]').value;

  const gid = `gid://shopify/ProductVariant/${numericId}`;
  return btoa(gid); // base64 encode for storefront API
}

openBtn?.addEventListener("click", () => {
  modal.classList.remove("hidden");
  loadStores();
});

closeBtn?.addEventListener("click", () => {
  modal.classList.add("hidden");
});

async function loadStores(){

  const variantId = getVariantId();

  const query = `
  query ($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        storeAvailability(first: 50) {
          edges {
            node {
              available
              location {
                id
                name
                address {
                  city
                }
              }
            }
          }
        }
      }
    }
  }`;

  const res = await fetch('/api/2023-10/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': window.storefrontToken
    },
    body: JSON.stringify({
      query: query,
      variables: { id: variantId }
    })
  });

  const json = await res.json();
  console.log("API RESPONSE:", json);

  if(!json.data){
    console.error("GraphQL error", json);
    return;
  }

  const edges = json.data.node.storeAvailability.edges;
  renderStores(edges);
}

function renderStores(edges){
  results.innerHTML = "";

  edges.forEach(edge=>{
    const store = edge.node;
    if(!store.available) return;

    const div = document.createElement("div");
    div.className = "store-item";

    div.innerHTML = `
      <strong>${store.location.name}</strong>
      <div>${store.location.address.city}</div>
    `;

    div.onclick = ()=>{
      document.querySelectorAll(".store-item").forEach(i=>i.classList.remove("active"));
      div.classList.add("active");
      selectedLocation = store.location.id;
      confirmBtn.disabled = false;
    };

    results.appendChild(div);
  });
}

const searchInput = document.getElementById("store-search");

searchInput?.addEventListener("input", e => {

  const term = e.target.value.toLowerCase().trim();
  const stores = document.querySelectorAll(".store-item");

  let visibleCount = 0;

  stores.forEach(el => {

    const text = el.innerText.toLowerCase();

    if(text.includes(term)){
      el.style.display = "block";
      visibleCount++;
    } else {
      el.style.display = "none";
    }

  });

  const existingMsg = document.getElementById("no-store-msg");
  if(existingMsg) existingMsg.remove();

  if(visibleCount === 0){
    const msg = document.createElement("p");
    msg.id = "no-store-msg";
    msg.textContent = "No store found";
    results.appendChild(msg);
  }

});


confirmBtn?.addEventListener("click", async ()=>{

  const numericId = document.querySelector('[name="id"]').value;

  await fetch('/cart/add.js',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      id: numericId,
      quantity: 1,
      properties:{
        pickup_location: selectedLocation
      }
    })
  });

  window.location.href="/cart";
});
