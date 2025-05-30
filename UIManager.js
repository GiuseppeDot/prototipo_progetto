// UIManager.js
console.log("UIManager.js evaluating");
import { ARController } from "./ARController.js";

let rendererRef = null;
let cameraRef = null;
let arCanvasElement = null; // The <canvas id="three-canvas">
let rotationControllerRef = null; // Added for RotationController instance

// Helper to get sidebar width (from CSS variable)
function getSidebarWidth() {
  const sidebarWString = getComputedStyle(document.documentElement)
    .getPropertyValue("--sidebar-w")
    .trim();
  return parseInt(sidebarWString, 10) || 0;
}

export const UIManager = {
  selectedModelUrl: null, // Added to store the selected model URL

  init(threeRenderer, threeCamera, canvasElement, rotationControllerInstance) {
    // Added rotationControllerInstance
    rendererRef = threeRenderer;
    cameraRef = threeCamera;
    arCanvasElement = canvasElement;
    rotationControllerRef = rotationControllerInstance; // Store the instance

    console.log("UIManager initialized");
    this.setupEventHandlers();
    this.populateMenuItems(menuData); // Assuming menuData will be here or passed
    this.updateCartUI(); // Initial cart UI update
    this.handleResize(); // Initial resize call
  },

  setupEventHandlers() {
    console.log("UIManager.setupEventHandlers called");

    // Sidebar Toggle Logic (adapted from test.js)
    const sidebar = document.getElementById("sidebar");
    const title = sidebar.querySelector("h2"); // Assuming 'L'ipotetico' is the h2
    const sidebarToggleBtn = document.getElementById("sidebarToggle");

    if (title) {
      title.style.cursor = "pointer";
      title.title = "Mostra / nascondi il menu";
      title.addEventListener("click", () => this.toggleSidebar());
    }
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener("click", () => this.toggleSidebar());
    }

    // Cart Toggle Logic (adapted from test.js)
    const cartBtn = document.getElementById("cartBtn");
    const cartPane = document.getElementById("cartPane");
    const closeCartBtn = document.getElementById("closeCart");
    if (cartBtn) cartBtn.onclick = () => this.openCart();
    if (closeCartBtn) closeCartBtn.onclick = () => this.closeCart();

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        cartPane &&
        cartPane.classList.contains("open")
      ) {
        this.closeCart();
      }
    });
    document.addEventListener("click", (e) => {
      if (
        cartPane &&
        cartPane.classList.contains("open") &&
        !cartPane.contains(e.target) &&
        e.target !== cartBtn
      ) {
        this.closeCart();
      }
    });

    // Cart Operations (adapted from test.js)
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("addCart")) {
        const itemFile = e.target.dataset.src;
        const item = menuData.find((m) => m.file === itemFile);
        if (item) {
          this.addItemToCart(item);
        }
      }
    });
    const clearCartBtn = document.getElementById("clearCart");
    if (clearCartBtn) clearCartBtn.onclick = () => this.clearCart();

    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn)
      checkoutBtn.onclick = () =>
        alert("Grazie! Funzione checkout da implementare.");

    // Listen for window resize events for general responsiveness
    window.addEventListener("resize", () => this.handleResize());

    // Add event listener for .showAR buttons
    // Using document as the event root for simplicity, assuming cards are dynamically added.
    document.addEventListener("click", (e) => {
      const showARButton = e.target.closest(".showAR");
      if (showARButton && showARButton.dataset.src) {
        this.setSelectedModelUrl(showARButton.dataset.src);
        // IMPORTANT: Ensure no old model loading logic is triggered here.
        // This click should only set the URL. The actual AR/model loading
        // will be handled by WebXRManager after QR scan and tap.
        console.log(".showAR button clicked, model URL set via UIManager.");

        // Optional: Provide user feedback that model is selected for AR.
        // For example, briefly highlight the button or show a message.
        // Or, rely on the next step which is typically starting the QR/AR flow.
      }
    });

    // Setup Auto-Rotate Button Listener
    const autoRotateButton = document.getElementById("autoRotateBtn");
    if (autoRotateButton && rotationControllerRef) {
      autoRotateButton.addEventListener("click", () => {
        rotationControllerRef.toggleAutoRotate();
      });
    } else if (!rotationControllerRef) {
      console.warn(
        "RotationController instance not provided to UIManager for auto-rotate button."
      );
    }
  },

  toggleSidebar() {
    document.body.classList.toggle("sidebar-closed");
    console.log("Sidebar toggled. Body classList:", document.body.className);
    // Crucially, trigger a resize update for Three.js scene
    this.handleResize();
  },

  handleResize() {
    if (!arCanvasElement) {
      console.warn("AR canvas element not set in UIManager for resize.");
      // Try to get it if not set - this is a fallback.
      arCanvasElement = document.getElementById("three-canvas");
      if (!arCanvasElement) return;
    }

    const sidebarOpen = !document.body.classList.contains("sidebar-closed");
    const sidebarWidth = sidebarOpen ? getSidebarWidth() : 0;

    const newWidth = window.innerWidth - sidebarWidth;
    const newHeight = window.innerHeight;

    arCanvasElement.style.left = sidebarWidth + "px";
    arCanvasElement.style.width = newWidth + "px";
    // Note: The canvas element itself gets its width style property set.
    // The renderer and camera updates will use newWidth and newHeight.

    console.log(
      `UIManager.handleResize: sidebarOpen=${sidebarOpen}, sidebarActualWidth=${sidebarWidth}, newCanvasWidth=${newWidth}, newCanvasHeight=${newHeight}`
    );

    if (rendererRef && cameraRef) {
      rendererRef.setSize(newWidth, newHeight);
      cameraRef.aspect = newWidth / newHeight;
      cameraRef.updateProjectionMatrix();
      console.log("Three.js renderer and camera updated.");
      // ARController.onResize(); // ARController is largely unused with WebXR, consider removing this call.
    } else {
      console.warn(
        "Renderer or Camera not available in UIManager during handleResize. Dimensions logged only."
      );
    }
  },

  // Placeholder for menu data and rendering (adapt from test.js)
  populateMenuItems(data) {
    // This part needs the menuData and renderCard function from original test.js
    // For now, just log. Actual DOM manipulation will be complex.
    console.log("UIManager.populateMenuItems called with data:", data.length);

    const renderCard = (i) => `
      <div class="card" id="card-${i.file}">
        <img src="${i.img}" alt="${i.name}">
        <h4>${i.name} – €${i.price.toFixed(2)}</h4>
        <p>${i.desc}</p>
        <button class="showAR" data-src="${i.file}">Vedi in AR</button>
        <button class="addCart" data-src="${i.file}">Aggiungi</button>
      </div>`;

    const bestsellerList = document.getElementById("bestsellerList");
    const primiList = document.getElementById("primiList");
    const secondiList = document.getElementById("secondiList");

    if (bestsellerList) {
      bestsellerList.innerHTML = data
        .filter((i) => i.categoria === "bestseller")
        .map(renderCard)
        .join("");
    }
    if (primiList) {
      primiList.innerHTML = data
        .filter((i) => i.categoria === "primo")
        .map(renderCard)
        .join("");
    }
    if (secondiList) {
      secondiList.innerHTML = data
        .filter((i) => i.categoria === "secondo")
        .map(renderCard)
        .join("");
    }
    console.log("Menu items populated.");
  },

  // Cart Functionality (adapted from test.js)
  cart: JSON.parse(localStorage.getItem("ARcart") || "[]"),

  addItemToCart(item) {
    this.cart.push(item);
    this.updateCartUI(true);
  },

  updateCartUI(anim = false) {
    const badge = document.getElementById("badge");
    const cartItemsList = document.getElementById("cartItems");
    const cartTotalEl = document.getElementById("cartTotal");

    if (badge) badge.textContent = this.cart.length;
    if (anim && badge) {
      badge.animate(
        [
          { transform: "scale(.8)" },
          { transform: "scale(1.3)" },
          { transform: "scale(1)" },
        ],
        { duration: 350, easing: "ease-out" }
      );
    }
    if (cartItemsList) {
      cartItemsList.innerHTML = this.cart
        .map((i) => `<li>${i.name} – €${i.price.toFixed(2)}</li>`)
        .join("");
    }
    if (cartTotalEl) {
      cartTotalEl.textContent =
        "Totale €" + this.cart.reduce((s, i) => s + i.price, 0).toFixed(2);
    }
    localStorage.setItem("ARcart", JSON.stringify(this.cart));
    console.log("Cart UI updated. Items:", this.cart.length);
  },

  clearCart() {
    this.cart.length = 0;
    this.updateCartUI();
  },

  openCart() {
    const cartPane = document.getElementById("cartPane");
    const cartBtn = document.getElementById("cartBtn");
    if (cartPane) cartPane.classList.add("open");
    if (cartBtn) cartBtn.classList.add("hide");
  },

  closeCart() {
    const cartPane = document.getElementById("cartPane");
    const cartBtn = document.getElementById("cartBtn");
    if (cartPane) cartPane.classList.remove("open");
    if (cartBtn) cartBtn.classList.remove("hide");
  },

  // Methods for model URL management
  setSelectedModelUrl(url) {
    this.selectedModelUrl = url;
    console.log("UIManager: Selected model URL set to", url);
    // Potentially add visual feedback here
  },

  getSelectedModelUrl() {
    console.log(
      "UIManager: getSelectedModelUrl called, returning",
      this.selectedModelUrl
    );
    return this.selectedModelUrl;
  },

  // --- AR Status Message Functions ---
  showARStatusMessage(message, duration = 3000) {
    const feedbackElement = document.getElementById("arStatusMessage");
    if (feedbackElement) {
      feedbackElement.textContent = message;
      feedbackElement.style.display = "block";

      // Clear existing timeout if any
      if (this.statusMessageTimeout) {
        clearTimeout(this.statusMessageTimeout);
      }

      if (duration > 0) {
        this.statusMessageTimeout = setTimeout(() => {
          feedbackElement.style.display = "none";
          this.statusMessageTimeout = null;
        }, duration);
      }
    } else {
      console.warn("arStatusMessage element not found in DOM.");
    }
  },

  hideARStatusMessage() {
    const feedbackElement = document.getElementById("arStatusMessage");
    if (feedbackElement) {
      feedbackElement.style.display = "none";
    }
    if (this.statusMessageTimeout) {
      clearTimeout(this.statusMessageTimeout);
      this.statusMessageTimeout = null;
    }
  },
  statusMessageTimeout: null, // Variable to hold the timeout ID
};

// Menu Data (copied from test.js - this might be better managed elsewhere in a real app)
const menuData = [
  {
    name: "Bruschetta",
    file: "Cibo.glb",
    price: 7.5,
    desc: "Pane croccante con pomodorini, basilico e olio EVO.",
    img: "./asset/bruschetta.jpg",
    categoria: "bestseller",
  },
  {
    name: "Pizza Margherita",
    file: "Margherita.glb",
    price: 8.5,
    desc: "Classica con mozzarella e basilico.",
    img: "./asset/margherita.jpg",
    categoria: "bestseller",
  },
  {
    name: "Spaghetti Carbonara",
    file: "Carbonara.glb",
    price: 11.0,
    desc: "Guanciale, pecorino e uovo.",
    img: "./asset/carbonara.jpg",
    categoria: "primo",
  },
  {
    name: "Lasagne",
    file: "Lasagne.glb",
    price: 12.0,
    desc: "Ragù, besciamella e parmigiano.",
    img: "./asset/lasagne.jpg",
    categoria: "primo",
  },
  {
    name: "Tagliata di Manzo",
    file: "Tagliata.glb",
    price: 17.0,
    desc: "Controfiletto con rucola e grana.",
    img: "./asset/tagliata.jpg",
    categoria: "secondo",
  },
  {
    name: "Salmone alla griglia",
    file: "Salmone.glb",
    price: 15.0,
    desc: "Filetto di salmone, salsa agrumi.",
    img: "./asset/salmone.jpg",
    categoria: "secondo",
  },
];
