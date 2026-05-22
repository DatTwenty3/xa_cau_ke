document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Map
  const defaultCenter = [9.914, 106.08];
  const map = L.map("map", {
    zoomControl: false, // Disabling default zoom control to position custom styled one
  }).setView(defaultCenter, 13);

  // Add custom zoom control in top-left but below the sidebar toggle
  L.control
    .zoom({
      position: "topleft",
    })
    .addTo(map);

  // 2. Define Google Map Layers
  const tileLayers = {
    hybrid: L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      attribution: "Map data &copy;2026 Google",
    }),
    roadmap: L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      attribution: "Map data &copy;2026 Google",
    }),
    terrain: L.tileLayer("https://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      attribution: "Map data &copy;2026 Google",
    }),
    satellite: L.tileLayer(
      "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      {
        maxZoom: 20,
        attribution: "Map data &copy;2026 Google",
      }
    ),
  };

  // Add Hybrid layer as default (Satellite map with labels)
  let currentLayer = tileLayers.hybrid;
  currentLayer.addTo(map);

  // 3. Handle Floating Layer Switcher Buttons
  const layerButtons = document.querySelectorAll(".layer-btn");
  layerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetLayer = btn.getAttribute("data-layer");
      if (tileLayers[targetLayer] && tileLayers[targetLayer] !== currentLayer) {
        // Toggle active button style
        document.querySelector(".layer-btn.active").classList.remove("active");
        btn.classList.add("active");

        // Swap layers
        map.removeLayer(currentLayer);
        currentLayer = tileLayers[targetLayer];
        currentLayer.addTo(map);
      }
    });
  });

  // 4. Polygon Styling definitions (Vibrant High-Contrast Coral & Gold theme for max visibility on Satellite)
  const defaultPolygonStyle = {
    color: "#ff4d4d", // Vibrant Neon Coral Red
    weight: 4.0,      // Thicker and more prominent
    opacity: 0.95,
    fillColor: "#ff4d4d",
    fillOpacity: 0.06, // Faint premium red overlay, highly transparent to view satellite layers clearly
    className: "commune-polygon",
  };

  const hoverPolygonStyle = {
    color: "#ff9f0a", // Luminous Neon Gold
    weight: 5.5,      // Even thicker on hover for tactile responsiveness
    opacity: 1.0,
    fillColor: "#ff9f0a",
    fillOpacity: 0.14,
    className: "commune-polygon hover",
  };

  let geojsonLayer;

  // 5. Setup Interactive GeoJSON Boundaries
  function loadGeoJSON(geojsonData) {
    geojsonLayer = L.geoJSON(geojsonData, {
      style: defaultPolygonStyle,
      onEachFeature: (feature, layer) => {
        // Add subtle popup/tooltip showing hint
        layer.bindTooltip(
          `<strong>Xã ${feature.properties.ten}</strong><br><span style="font-size: 11px; opacity: 0.8;"><i class="fas fa-mouse-pointer"></i> Nhấp để xem chi tiết</span>`,
          {
            permanent: false,
            direction: "center",
            className: "custom-map-tooltip",
            opacity: 0.95,
          }
        );

        // Hover events
        layer.on("mouseover", (e) => {
          const l = e.target;
          l.setStyle(hoverPolygonStyle);
          l.bringToFront();
        });

        layer.on("mouseout", (e) => {
          geojsonLayer.resetStyle(e.target);
        });

        // Click event: Mở Sidebar (tự động căn chỉnh thông minh bên trong openSidebar)
        layer.on("click", (e) => {
          // Open sidebar
          openSidebar(feature.properties);

          // Hide the initial pulse hint overlay
          const hintOverlay = document.getElementById("map-hint");
          if (hintOverlay) {
            hintOverlay.style.opacity = "0";
            setTimeout(() => hintOverlay.remove(), 500);
          }
        });
      },
    }).addTo(map);

    // Zoom khít bounds của X xã khi mới load bản đồ
    map.fitBounds(geojsonLayer.getBounds(), {
      padding: window.innerWidth < 768 ? [30, 30] : [80, 80],
    });
  }

  // Load GeoJSON data directly via Fetch
  fetch("map data/Cầu Kè.geojson")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      loadGeoJSON(data);
    })
    .catch((err) => {
      console.error("Lỗi khi tải GeoJSON: ", err);
      alert(
        "Không thể tải dữ liệu bản đồ từ 'map data/Cầu Kè.geojson'.\n\n" +
        "Lưu ý: Nếu bạn đang mở trực tiếp file HTML (giao thức file://), trình duyệt sẽ chặn yêu cầu tải file này vì lý do bảo mật (CORS). " +
        "Vui lòng chạy ứng dụng thông qua một Web Server cục bộ (như VS Code Live Server, http-server, hoặc các công cụ tương tự)."
      );
    });

  // 6. Sidebar Controls & Backdrop
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  function openSidebar(props) {
    sidebar.classList.add("active");
    if (backdrop) backdrop.classList.add("active");

    // Change toggle button icon to close
    sidebarToggle.querySelector("i").className = "fas fa-times";
    sidebarToggle.style.display = "none"; // Hide floating button when sidebar is active to clean up UI

    // Update details in sidebar
    document.getElementById("commune-name").innerText = `Xã ${props.ten}`;
    document.getElementById("commune-code-val").innerText = props.ma || "30050";

    // Leaders
    document.getElementById("leader-secretary-name").innerText =
      props.bi_thu || "Chưa cập nhật";
    document.getElementById("leader-chairman-name").innerText =
      props.chu_tich || "Chưa cập nhật";

    // Call buttons links (strip spaces)
    const telBt = props.sdt_bt ? props.sdt_bt.replace(/\s+/g, "") : "";
    const telCt = props.sdt_ct ? props.sdt_ct.replace(/\s+/g, "") : "";
    document.getElementById("call-bt-btn").href = telBt ? `tel:${telBt}` : "#";
    document.getElementById("call-ct-btn").href = telCt ? `tel:${telCt}` : "#";

    // Table elements
    document.getElementById("info-type").innerText = props.loai || "Xã";
    document.getElementById("info-level").innerText = `Cấp ${props.cap || "2"
      }`;
    document.getElementById("info-stt").innerText = props.stt || "--";
    document.getElementById("info-merger").innerText =
      props.sap_nhap || "Không có";

    // Trigger Stat counter animations
    const areaVal = parseFloat(props.dien_tich_km2 || 54.12);
    const popVal = parseInt(props.dan_so || 35491);
    const densityVal = parseFloat(props.mat_do_km2 || 655.78);

    animateValue("stat-area", 0, areaVal, 1000, 2, " km²");
    animateValue("stat-pop", 0, popVal, 1200, 0, "");
    animateValue("stat-density", 0, densityVal, 1500, 2, "");

    // Căn chỉnh khung hình bản đồ tự động thông minh (Smart View Panning)
    if (geojsonLayer) {
      geojsonLayer.eachLayer((layer) => {
        const bounds = layer.getBounds();
        map.fitBounds(bounds, {
          paddingTopLeft: window.innerWidth < 768 ? [20, 90] : [100, 100],
          // Bottom sheet trên mobile cao 65vh, ta đệm phía dưới đáng kể để dồn bản đồ lên 35% trên màn hình
          paddingBottomRight: window.innerWidth < 768 ? [20, window.innerHeight * 0.65 + 15] : [100, 100],
          maxZoom: 14,
          animate: true,
          duration: 1.2,
        });
      });
    }

    // Tự động phát thuyết minh giọng nói giới thiệu thông tin xã
    speakCommuneInfo(props);
  }

  function closeSidebar() {
    // Dừng phát âm thanh giới thiệu khi đóng bảng thông tin
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    const ttsBtn = document.getElementById("tts-btn");
    if (ttsBtn) ttsBtn.classList.remove("speaking");

    sidebar.classList.remove("active");
    if (backdrop) {
      backdrop.classList.remove("active");
      backdrop.style.opacity = ""; // Reset drag opacity
    }
    sidebar.style.transform = ""; // Reset drag transform
    sidebar.style.transition = ""; // Reset transition override
    sidebarToggle.querySelector("i").className = "fas fa-bars";
    sidebarToggle.style.display = "flex"; // Re-show toggle button

    // Căn chỉnh bản đồ khít ranh giới xã đầy đủ khi đóng sidebar
    if (geojsonLayer) {
      map.fitBounds(geojsonLayer.getBounds(), {
        padding: window.innerWidth < 768 ? [30, 80] : [80, 80],
        animate: true,
        duration: 1.0,
      });
    }
  }

  closeSidebarBtn.addEventListener("click", closeSidebar);

  if (backdrop) {
    backdrop.addEventListener("click", closeSidebar);
  }

  sidebarToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("active")) {
      closeSidebar();
    } else {
      // If we open manually via toggle, we look for properties in geojsonLayer
      if (geojsonLayer) {
        geojsonLayer.eachLayer((layer) => {
          openSidebar(layer.feature.properties);
        });
      }
    }
  });

  // 7. Bộ lắng nghe cảm ứng vuốt chạm (Swipe Gesture) kéo Bottom Sheet xuống để đóng
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const bottomSheetHandle = document.querySelector(".bottom-sheet-handle");
  const sidebarHeader = document.querySelector(".sidebar-header");

  function handleTouchStart(e) {
    if (window.innerWidth > 768) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    sidebar.style.transition = "none"; // Tắt transition để di chuyển theo ngón tay thời gian thực
  }

  function handleTouchMove(e) {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;

    // Chỉ cho phép kéo đi xuống dưới (cử chỉ đóng)
    if (diffY > 0) {
      sidebar.style.transform = `translateY(${diffY}px)`;

      // Giảm dần độ mờ lớp phủ nền khi kéo xuống
      const sheetHeight = window.innerHeight * 0.65;
      const percentOpen = Math.max(0, 1 - (diffY / sheetHeight));
      if (backdrop) {
        backdrop.style.opacity = percentOpen.toString();
      }
    }
  }

  function handleTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    sidebar.style.transition = ""; // Khôi phục smooth CSS transitions ban đầu

    const diffY = currentY - startY;

    // Nếu khoảng kéo lớn hơn 120px, kích hoạt đóng hoàn toàn Bottom Sheet
    if (diffY > 120) {
      closeSidebar();
    } else {
      // Nếu kéo chưa đủ xa, nảy (snap) trở lại trạng thái mở hoàn toàn
      sidebar.style.transform = "";
      if (backdrop) backdrop.style.opacity = "";
    }

    startY = 0;
    currentY = 0;
  }

  if (bottomSheetHandle && sidebarHeader) {
    [bottomSheetHandle, sidebarHeader].forEach((el) => {
      el.addEventListener("touchstart", handleTouchStart, { passive: true });
      el.addEventListener("touchmove", handleTouchMove, { passive: true });
      el.addEventListener("touchend", handleTouchEnd, { passive: true });
    });
  }

  // 7. Value Count-up Animation Helper (Ease Out Quad)
  function animateValue(id, start, end, duration, decimals = 0, suffix = "") {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuad: f(t) = t * (2 - t)
      const easeProgress = progress * (2 - progress);
      const currentValue = easeProgress * (end - start) + start;

      // Format value with thousands separator
      let formattedVal = currentValue.toFixed(decimals);
      if (decimals === 0 || id === "stat-pop") {
        formattedVal = Math.round(currentValue)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      } else {
        // Floating point Vietnamese format (comma for decimal, dot for thousands)
        const parts = currentValue.toFixed(decimals).split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        formattedVal = parts.join(",");
      }

      obj.innerHTML = formattedVal + suffix;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // 8. Text-to-Speech (TTS) Voice Introduction for the Commune
  let currentAudio = null;
  let currentProperties = null;

  function speakCommuneInfo(props) {
    // Dừng phát âm thanh hiện tại nếu có
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    currentProperties = props; // Lưu trữ để phát lại thủ công nếu cần

    const ma = props.ma || "30050";
    const audioPath = `audio/${ma}.mp3`;
    
    currentAudio = new Audio(audioPath);
    
    const ttsBtn = document.getElementById("tts-btn");
    const ttsIcon = ttsBtn ? ttsBtn.querySelector("i") : null;

    currentAudio.addEventListener("play", () => {
      if (ttsBtn) ttsBtn.classList.add("speaking");
      if (ttsIcon) ttsIcon.className = "fas fa-volume-up";
    });

    currentAudio.addEventListener("ended", () => {
      if (ttsBtn) ttsBtn.classList.remove("speaking");
      if (ttsIcon) ttsIcon.className = "fas fa-volume-up";
      currentAudio = null;
    });

    currentAudio.addEventListener("error", (e) => {
      console.error("Lỗi tải/phát âm thanh thuyết minh:", e);
      if (ttsBtn) ttsBtn.classList.remove("speaking");
      if (ttsIcon) ttsIcon.className = "fas fa-volume-up";
      currentAudio = null;
    });

    currentAudio.play().catch((err) => {
      console.warn("Trình duyệt chặn tự động phát âm thanh:", err);
      if (ttsBtn) ttsBtn.classList.remove("speaking");
    });
  }

  // Thiết lập trình bắt sự kiện click cho nút loa phát thanh điều khiển thủ công
  const ttsBtn = document.getElementById("tts-btn");
  if (ttsBtn) {
    ttsBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        ttsBtn.classList.remove("speaking");
      } else if (currentProperties) {
        speakCommuneInfo(currentProperties);
      }
    });
  }
});
