/* ===============================================================
   App JS – versione FIX 2025-05-21
   – Render piatti sempre visibili
   – Safe-load dentro DOMContentLoaded
   – Log diagnostici (rimuovili quando sei certo che funzioni)
================================================================ */

window.addEventListener("DOMContentLoaded", () => {
  /* ---------- helper brevi ---------- */
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  // const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]; // qsa not used in this file anymore

  /* 
    All Menu Data, Rendering, Cart Logic, Sidebar Logic, 
    and their associated event listeners have been moved to UIManager.js.
    test.js will now focus only on QR Code scanning initialization and management.
  */

  console.info("test.js: Initializing QR Scanner logic.");

  /* ---------- AR LOGIC (A-Frame specific - now removed/commented) ---------- */
  // const STEP = 0.25; // Old
  // const holder = qs("#modelHolder"); // Old A-Frame element
  // const sceneEl = qs("a-scene"); // Old A-Frame element
  // ... other A-Frame related variables and functions (setModel, setupModelOrientation, event listeners) removed ...

  /* === Global Event Listeners (for .showAR, .addCart, etc.) === */
  // These are now handled by UIManager.js through its own event listeners,
  // typically set up during populateMenuItems or in setupEventHandlers.
  // The old global click listener in test.js is removed to avoid duplication.
  // document.addEventListener("click", (e) => { ... }); // REMOVED

  /* ---------- NEW QR SCANNER LOGIC FOR WEBXR ---------- */
  const qrScannerUI = qs("#qrScannerUI");
  const qrVideoFeed = qs("#qrVideoFeed");
  const qrCanvas = qs("#qrCanvas");
  const qrCanvasCtx = qrCanvas.getContext("2d");
  let currentQRScanRequest = null; // To store the requestAnimationFrame id
  let videoStream = null; // To store the MediaStream

  function startQRScanner() {
    console.log("Attempting to start QR Scanner...");
    window.UIManager?.showARStatusMessage(
      "Scan a QR code to begin AR experience.",
      0
    );

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser.");
      alert("Camera access is not supported in this browser.");
      window.UIManager?.showARStatusMessage(
        "Camera access not supported.",
        5000
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        videoStream = stream;
        qrVideoFeed.srcObject = stream;
        qrVideoFeed.onloadedmetadata = function (e) {
          qrVideoFeed.play();
          qrScannerUI.style.display = "flex";
          qrCanvas.width = qrVideoFeed.videoWidth;
          qrCanvas.height = qrVideoFeed.videoHeight;
          console.log(
            "QR Scanner UI visible, video playing. Canvas dimensions:",
            qrCanvas.width,
            qrCanvas.height
          );
          scanQRCode();
        };
      })
      .catch(function (err) {
        console.error("Error accessing camera: ", err);
        alert(
          "Could not access the camera. Please ensure permissions are granted."
        );
        qrScannerUI.style.display = "flex";
        qs("#qrScannerUI p").textContent =
          "Error accessing camera. Please check permissions.";
        window.UIManager?.showARStatusMessage(
          "Could not access camera. Check permissions.",
          5000
        );
      });
  }

  function stopQRScanner() {
    console.log("Stopping QR Scanner...");
    if (currentQRScanRequest) {
      cancelAnimationFrame(currentQRScanRequest);
      currentQRScanRequest = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }
    qrVideoFeed.srcObject = null;
    if (qrScannerUI) {
      // Check if qrScannerUI exists, it might be null if called during page unload
      qrScannerUI.style.display = "none";
    }
    console.log("QR Scanner stopped, UI hidden.");
  }

  function scanQRCode() {
    if (qrVideoFeed.readyState === qrVideoFeed.HAVE_ENOUGH_DATA) {
      // Ensure canvas is same size as video display size, in case it changed
      if (qrCanvas.width !== qrVideoFeed.videoWidth)
        qrCanvas.width = qrVideoFeed.videoWidth;
      if (qrCanvas.height !== qrVideoFeed.videoHeight)
        qrCanvas.height = qrVideoFeed.videoHeight;

      qrCanvasCtx.drawImage(qrVideoFeed, 0, 0, qrCanvas.width, qrCanvas.height);
      try {
        const code = jsQR(
          qrCanvasCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height).data,
          qrCanvas.width,
          qrCanvas.height,
          {
            inversionAttempts: "dontInvert",
          }
        );

        if (code && code.data) {
          console.log("QR Code detected:", code.data);
          // For now, any QR code is valid.
          // TODO: Implement specific QR code payload validation if needed.
          // e.g. if (code.data.startsWith("https://myar.app/experience?id="))

          stopQRScanner();

          // Call WebXRManager to enable the Start AR button
          // Assuming WebXRManager is exposed on the window object by app.js
          if (
            window.WebXRManager &&
            typeof window.WebXRManager.prepareForXRSession === "function"
          ) {
            window.WebXRManager.prepareForXRSession();
            // Optionally, pass QR code data: window.WebXRManager.prepareForXRSession(code.data);
          } else {
            console.error(
              "WebXRManager.prepareForXRSession() not found. Cannot proceed to AR."
            );
            // alert("Error: AR system is not ready. Please reload."); // Replaced by UIManager message
            window.UIManager?.showARStatusMessage(
              "Error: AR system not ready. Please refresh and try again.",
              0
            );
          }
          return; // Exit scan loop
        }
      } catch (err) {
        console.error("Error during QR scan:", err);
        // Continue scanning
      }
    }
    currentQRScanRequest = requestAnimationFrame(scanQRCode);
  }

  // Expose restartQRScanning to be called from WebXRManager
  window.restartQRScanning = function () {
    console.log("window.restartQRScanning called.");
    // Potentially reset any stored QR data here if necessary
    qs("#qrScannerUI p").textContent = "Scan QR Code to Start AR Experience"; // Reset message
    startQRScanner();
  };

  // Initial start of QR scanning when page is ready
  startQRScanner();

  /* ---------- OLD AR.js MARKER LOGIC (Commented out / To be removed) ---------- */
  /*
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
  */

  /* ---------- OLD FALLBACK viewer (Commented out / To be removed) ---------- */
  /*
  const fallback = qs("#fallback");
  window.addEventListener("arjs-video-loaded", () => clearTimeout(fbTO));
  const fbTO = setTimeout(() => {
    fallback.style.display = "block";
  }, 6000);
  */
});
