/* ===============================================================
   App JS – versione FIX 2025-05-21
   – Render piatti sempre visibili
   – Safe-load dentro DOMContentLoaded
   – Log diagnostici (rimuovili quando sei certo che funzioni)
================================================================ */

window.addEventListener("DOMContentLoaded", () => {
  /* ---------- helper brevi ---------- */
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- MENU DATI (immagini + categorie) ---------- */
  const menuData = [
    /* ⭐ Best Seller */
    {
      name: "Bruschetta",
      file: "asset/Cibo.glb",
      price: 7.5,
      desc: "Pane croccante con pomodorini, basilico e olio EVO.",
      img: "./asset/bruschetta.jpg",
      categoria: "bestseller",
    },

    {
      name: "Pizza Margherita",
      file: "asset/Margherita.glb",
      price: 8.5,
      desc: "Classica con mozzarella e basilico.",
      img: "./asset/margherita.jpg",
      categoria: "bestseller",
    },

    /* 🥣 Primi */
    {
      name: "Spaghetti Carbonara",
      file: "asset/Carbonara.glb",
      price: 11.0,
      desc: "Guanciale, pecorino e uovo.",
      img: "./asset/carbonara.jpg",
      categoria: "primo",
    },

    {
      name: "Lasagne",
      file: "asset/Lasagne.glb",
      price: 12.0,
      desc: "Ragù, besciamella e parmigiano.",
      img: "./asset/lasagne.jpg",
      categoria: "primo",
    },

    /* 🥩 Secondi */
    {
      name: "Tagliata di Manzo",
      file: "asset/Tagliata.glb",
      price: 17.0,
      desc: "Controfiletto con rucola e grana.",
      img: "./asset/tagliata.jpg",
      categoria: "secondo",
    },

    {
      name: "Salmone alla griglia",
      file: "asset/Salmone.glb",
      price: 15.0,
      desc: "Filetto di salmone, salsa agrumi.",
      img: "./asset/salmone.jpg",
      categoria: "secondo",
    },
  ];

  /* ---------- RENDER LISTE ---------- */
  const renderCard = (i) => `
    <div class="card" id="card-${i.file}">
      <img src="${i.img}" alt="${i.name}">
      <h4>${i.name} – €${i.price.toFixed(2)}</h4>
      <p>${i.desc}</p>
      <button class="showAR"  data-src="${i.file}">Vedi in AR</button>
      <button class="addCart" data-src="${i.file}">Aggiungi</button>
    </div>`;

  qs("#bestsellerList").innerHTML = menuData
    .filter((i) => i.categoria === "bestseller")
    .map(renderCard)
    .join("");
  qs("#primiList").innerHTML = menuData
    .filter((i) => i.categoria === "primo")
    .map(renderCard)
    .join("");
  qs("#secondiList").innerHTML = menuData
    .filter((i) => i.categoria === "secondo")
    .map(renderCard)
    .join("");

  /* ---------- LOG diagnostico ---------- */
  console.info("Piatti caricati:", {
    bestseller: qs("#bestsellerList").children.length,
    primi: qs("#primiList").children.length,
    secondi: qs("#secondiList").children.length,
  });

  /* ---------- AR LOGIC (come funzionante in precedenza) ---------- */
  const STEP = 0.25;
  const holder = qs("#modelHolder");
  const sceneEl = qs("a-scene"); // Get reference to the scene
  let currSrc = null;
  let modelDetached = false; // Re-introduce modelDetached
  let isDragging = false;
  let previousMouseX = 0;
  let currentYRotation = 0;

  function setModel(src) {
    if (!src) return;
    currSrc = src;
    holder.setAttribute("visible", "false");
    holder.setAttribute("gltf-model", src);
    qs("#fallback").src = src;
  }
  function setupModelOrientation() {
    // Set fixed initial X rotation and position. Y rotation is set to 0 (neutral).
    holder.object3D.rotation.set(-Math.PI / 2, 0, 0);
    holder.object3D.position.set(0, 0.25, 0); // Default position
  }
  holder.addEventListener("model-loaded", () => {
    holder.emit("fade", null, false);
    setupModelOrientation();
    currentYRotation = 0; // Initialize interactive Y rotation
  });

  /* === Mouse Drag Rotation Logic === */
  sceneEl.addEventListener("mousedown", (event) => {
    if (holder.getAttribute("visible") !== "true") return;
    isDragging = true;
    previousMouseX = event.clientX;
    event.preventDefault();
  });

  sceneEl.addEventListener("mousemove", (event) => {
    if (!isDragging || holder.getAttribute("visible") !== "true") return;
    const currentMouseX = event.clientX;
    const deltaX = currentMouseX - previousMouseX;
    previousMouseX = currentMouseX;
    const rotationFactor = 0.01; // Sensitivity factor
    currentYRotation += deltaX * rotationFactor;
    holder.object3D.rotation.set(-Math.PI / 2, currentYRotation, 0);
  });

  sceneEl.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Touch events for mobile
  sceneEl.addEventListener("touchstart", (event) => {
    if (holder.getAttribute("visible") !== "true") return;
    isDragging = true;
    previousMouseX = event.touches[0].clientX;
    event.preventDefault();
  });

  sceneEl.addEventListener("touchmove", (event) => {
    if (!isDragging || holder.getAttribute("visible") !== "true") return;
    const currentMouseX = event.touches[0].clientX;
    const deltaX = currentMouseX - previousMouseX;
    previousMouseX = currentMouseX;
    const rotationFactor = 0.01; // Sensitivity factor
    currentYRotation += deltaX * rotationFactor;
    holder.object3D.rotation.set(-Math.PI / 2, currentYRotation, 0);
  });

  sceneEl.addEventListener("touchend", () => {
    isDragging = false;
  });
  sceneEl.addEventListener("touchcancel", () => {
    isDragging = false;
  });

  /* === Toggle via <h2> "Menù 3D" ========================= */
  const sidebar = qs("#sidebar");
  const title = qs("#sidebar h2");

  title.style.cursor = "pointer";
  title.title = "Mostra / nascondi il menu";

  const toggleSidebar = () => document.body.classList.toggle("sidebar-closed");

  title.addEventListener("click", toggleSidebar);
  qs("#sidebarToggle").addEventListener("click", toggleSidebar);

  /* ---------- EVENTI GLOBALI (AR & CART) ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.classList.contains("showAR")) setModel(b.dataset.src);
    if (b.classList.contains("addCart")) {
      const item = menuData.find((m) => m.file === b.dataset.src);
      //   cart.push(item);
      updateCartUI(true);
    }
  });

  /* ====== CART STATE ================================================ */
  const cart = JSON.parse(localStorage.getItem("ARcart") || "[]");
  const badge = qs("#badge");
  const pane = qs("#cartPane");
  const list = qs("#cartItems");
  const total = qs("#cartTotal");

  function updateCartUI(anim = false) {
    badge.textContent = cart.length;
    if (anim) {
      badge.animate(
        [
          { transform: "scale(.8)" },
          { transform: "scale(1.3)" },
          { transform: "scale(1)" },
        ],
        { duration: 350, easing: "ease-out" }
      );
    }
    list.innerHTML = cart
      .map((i) => `<li>${i.name} – €${i.price.toFixed(2)}</li>`)
      .join("");
    total.textContent =
      "Totale €" + cart.reduce((s, i) => s + i.price, 0).toFixed(2);
    localStorage.setItem("ARcart", JSON.stringify(cart));
  }
  updateCartUI();

  /* === TOGGLE CARRELLO ============================================ */
  const cartBtn = qs("#cartBtn");

  function openCart() {
    pane.classList.add("open");
    cartBtn.classList.add("hide"); // ① nasconde il FAB
  }
  function closeCart() {
    pane.classList.remove("open");
    cartBtn.classList.remove("hide"); // ② lo mostra di nuovo
  }

  cartBtn.onclick = openCart;
  qs("#closeCart").onclick = closeCart;

  /* ESC o click fuori area chiudono */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });
  document.addEventListener("click", (e) => {
    if (
      pane.classList.contains("open") &&
      !pane.contains(e.target) &&
      e.target !== cartBtn
    ) {
      closeCart();
    }
  });

  /* —— cart operations —— */
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("addCart")) {
      const item = menuData.find((m) => m.file === e.target.dataset.src);
      cart.push(item);
      updateCartUI(true);
    }
  });
  qs("#clearCart").onclick = () => {
    cart.length = 0;
    updateCartUI();
  };
  qs("#checkoutBtn").onclick = () =>
    alert("Grazie! Funzione checkout da implementare.");

  /* ---------- QR SCAN (rimasto invariato) ---------- */
  const canv = qs("#qrCanvas"),
    ctx = canv.getContext("2d");
  let lastQR = "";
  const qrInit = setInterval(() => {
    const vid = qs("#arjs-video");
    if (!vid || !vid.videoWidth) return;
    clearInterval(qrInit);
    canv.width = vid.videoWidth;
    canv.height = vid.videoHeight;
    (function scan() {
      ctx.drawImage(vid, 0, 0, canv.width, canv.height);
      const code = jsQR(
        ctx.getImageData(0, 0, canv.width, canv.height).data,
        canv.width,
        canv.height
      );
      if (code && code.data !== lastQR) {
        lastQR = code.data.trim();
        if (lastQR.toLowerCase().endsWith(".glb")) setModel(lastQR);
      }
      requestAnimationFrame(scan);
    })();
  }, 400);

  /* ---------- MARKER detach/attach ---------- */
  const marker = qs("a-marker");
  // Note: sceneEl is already defined above as: const sceneEl = qs("a-scene");

  marker.addEventListener("markerFound", () => {
    console.log("Marker Found!"); // Added console log
    if (modelDetached) {
      sceneEl.object3D.remove(holder.object3D); // Remove from scene
      marker.object3D.add(holder.object3D); // Add back to marker
      setupModelOrientation(); // Reset position and X,Z rotation relative to marker, Y to 0
      currentYRotation = 0; // Reset our tracking variable for interactive Y rotation
      // Immediately apply the reset Y rotation to the model's actual rotation
      holder.object3D.rotation.y = currentYRotation; // This directly sets Y, assuming X and Z are correctly set by setupModelOrientation
      modelDetached = false;
    }
    // Ensure the model is visible in any case when marker is found.
    holder.setAttribute("visible", "true");
  });

  marker.addEventListener("markerLost", () => {
    console.log("Marker Lost."); // Added console log
    if (!modelDetached) {
      holder.object3D.updateMatrixWorld(); // Ensure matrix is up-to-date
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      holder.object3D.getWorldPosition(p);
      holder.object3D.getWorldQuaternion(q);
      marker.object3D.remove(holder.object3D);
      sceneEl.object3D.add(holder.object3D);
      holder.object3D.position.copy(p);
      holder.object3D.quaternion.copy(q);
      modelDetached = true;
    }
    holder.setAttribute("visible", "true"); // Ensure it remains visible
  });

  /* ---------- FALLBACK viewer se la camera non parte ---------- */
  const fallback = qs("#fallback");
  window.addEventListener("arjs-video-loaded", () => clearTimeout(fbTO));
  const fbTO = setTimeout(() => {
    fallback.style.display = "block";
  }, 6000);
});
console.log("sono qua");
