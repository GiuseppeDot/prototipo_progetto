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
  selectedModelUrl: null, // Store the selected model URL
  selectedItem: null, // Store full menu item info
  currentOverlayItem: null, // Item shown in AR overlay

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
        const itemFile = showARButton.dataset.src;
        this.setSelectedModelUrl(itemFile);
        console.log(".showAR button clicked, model URL set to:", itemFile);

        const xrSession = window.WebXRManager?.getXRSession?.();
        if (xrSession) {
          if (
            window.WebXRManager &&
            typeof window.WebXRManager.hotSwapPlacedModel === "function"
          ) {
            window.WebXRManager.hotSwapPlacedModel(itemFile);
          } else {
            console.error(
              "WebXRManager.hotSwapPlacedModel not found while in AR mode."
            );
          }
        } else {
          const startBtn = document.getElementById("startXRButton");
          if (
            window.WebXRManager &&
            startBtn &&
            startBtn.style.display === "block"
          ) {
            if (
              typeof window.WebXRManager.placeModelWhenSurfaceFound ===
              "function"
            ) {
              window.WebXRManager.placeModelWhenSurfaceFound(
                "./asset/" + itemFile
              );
            }
            window.WebXRManager.activateXR();
          } else {
            console.warn("AR session not ready. Scan QR code first.");
            if (typeof this.showARStatusMessage === "function") {
              this.showARStatusMessage(
                "Scansiona il QR code prima di avviare l'AR.",
                3000
              );
            }
          }
        }
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

    // Event listener for the new AR sidebar toggle button
    const arSidebarToggleBtn = document.getElementById("arSidebarToggle");
    if (arSidebarToggleBtn) {
      arSidebarToggleBtn.addEventListener("click", () =>
        this.toggleSidebarAR()
      );
    }

    // Event listener for the AR Reselect Surface button
    const reselectBtn = document.getElementById("arReselectSurfaceBtn");
    if (reselectBtn) {
      reselectBtn.addEventListener("click", () => {
        if (
          window.WebXRManager &&
          typeof window.WebXRManager.clearPlacedModelAndReselectSurface ===
            "function"
        ) {
          window.WebXRManager.clearPlacedModelAndReselectSurface();
        } else {
          console.error(
            "WebXRManager.clearPlacedModelAndReselectSurface not found."
          );
        }
      });
    }

    const arAddBtn = document.getElementById("arAddToCartBtn");
    if (arAddBtn) {
      arAddBtn.addEventListener("click", () => {
        if (this.currentOverlayItem) {
          this.addItemToCart(this.currentOverlayItem);
          this.hideARModelOverlay();
        }
      });
    }
  },

  toggleSidebar() {
    // This is the original toggle, potentially for the main button outside AR mode
    // or the title click.
    // Ensure it doesn't conflict or behave unexpectedly if called during AR mode.
    // For now, it uses the same class 'sidebar-closed'.
    document.body.classList.toggle("sidebar-closed");
    console.log(
      "Main Sidebar toggled. Body classList:",
      document.body.className
    );
    // Crucially, trigger a resize update for Three.js scene
    this.handleResize();
  },

  toggleSidebarAR() {
    // This method is specifically for the button *inside* the AR-mode sidebar
    document.body.classList.toggle("sidebar-closed");
    console.log("AR Sidebar toggled. Body classList:", document.body.className);
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
    this.selectedItem = menuData.find((i) => i.file === url) || null;
    console.log("UIManager: Selected model URL set to", url);
    if (this.selectedItem) {
      console.log("UIManager: Selected item set to", this.selectedItem.name);
    }
    // Potentially add visual feedback here
  },

  getSelectedModelUrl() {
    console.log(
      "UIManager: getSelectedModelUrl called, returning",
      this.selectedModelUrl
    );
    return this.selectedModelUrl;
  },

  getSelectedItem() {
    return this.selectedItem;
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

  showARModelOverlay(item) {
    const overlay = document.getElementById("arModelOverlay");
    const nameEl = document.getElementById("arModelName");
    if (overlay && nameEl && item) {
      nameEl.textContent = item.name;
      overlay.style.display = "block";
      this.currentOverlayItem = item;
    }
  },

  hideARModelOverlay() {
    const overlay = document.getElementById("arModelOverlay");
    if (overlay) overlay.style.display = "none";
    this.currentOverlayItem = null;
  },
  statusMessageTimeout: null, // Variable to hold the timeout ID

  enterARMode() {
    console.log("UIManager: Entering AR Mode");
    document.body.classList.add("ar-active");

    // Hide QR Scanner UI specifically if it's managed here or globally accessible
    // WebXRManager already handles this, but good to ensure.
    const qrScannerUI = document.getElementById("qrScannerUI");
    if (qrScannerUI) {
      qrScannerUI.style.display = "none";
    }

    // Call handleResize to adjust canvas for AR mode (e.g., if sidebar state affects it)
    // The CSS for .ar-active #three-canvas will also apply.
    // this.handleResize(); // Now called by setARMode
    this.setARMode(true); // Calls handleResize internally
    this.hideReselectSurfaceButton(); // Ensure it's hidden when entering AR mode initially
    // Hide other non-essential UI elements via CSS by the .ar-active class on body.
  },

  exitARMode() {
    console.log("UIManager: Exiting AR Mode");
    document.body.classList.remove("ar-active");
    // If sidebar was closed in AR, ensure it's open by default when exiting AR.
    // Or, preserve its state - for now, let's ensure it's open or user can open it.
    // document.body.classList.remove('sidebar-closed'); // Optional: force sidebar open on exit

    // Call handleResize to restore canvas to normal mode layout
    // this.handleResize(); // Now called by setARMode
    this.setARMode(false); // Calls handleResize internally
    this.hideReselectSurfaceButton(); // Ensure it's hidden when exiting AR mode
    this.hideARModelOverlay();
    // QR Scanner UI visibility is typically handled by test.js when AR session ends
    // and restartQRScanning() is called.
  },

  setARMode(isARModeActive) {
    const arSidebarToggleButton = document.getElementById("arSidebarToggle");
    if (isARModeActive) {
      document.body.classList.add("ar-active-specific-ui-hide");
      if (arSidebarToggleButton) {
        // Assuming 'block' is the correct display style when visible.
        // Adjust if it's 'flex', 'inline-block', etc., based on its default CSS.
        arSidebarToggleButton.style.display = "block";
      }
    } else {
      document.body.classList.remove("ar-active-specific-ui-hide");
      if (arSidebarToggleButton) {
        arSidebarToggleButton.style.display = "none";
      }
    }
    this.handleResize(); // Call resize after UI changes that might affect layout
  },

  showReselectSurfaceButton() {
    const btn = document.getElementById("arReselectSurfaceBtn");
    if (btn && document.body.classList.contains("ar-active")) {
      // Only show if in AR mode
      btn.style.display = "block";
    }
  },

  hideReselectSurfaceButton() {
    const btn = document.getElementById("arReselectSurfaceBtn");
    if (btn) {
      btn.style.display = "none";
    }
  },
  // Make setARMode available if needed externally, though primarily used internally
  // setARMode: this.setARMode, // This line will cause an error due to 'this' context
  // Correct way to add it to the export is directly:
  // setARMode, // This will be defined later if we bind 'this' or make it a standalone function
};
// Let's define setARMode outside or ensure 'this' is correctly bound if it stays within the object.
// For simplicity and to match the export pattern, we'll adjust the UIManager object structure slightly
// or ensure methods are correctly bound if they rely on 'this' and are also directly exported.

// Given the current structure, methods are part of the UIManager object.
// If setARMode needs to be part of the public API and callable as UIManager.setARMode(),
// it should be defined within the UIManager object literal like other methods.
// The previous diff already placed it inside the UIManager object.
// The export will make all public methods of UIManager available.

// No direct changes needed here for export if setARMode is defined within UIManager object.
// The existing `export const UIManager = { ... }` exports all methods within it.

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
