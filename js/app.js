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

  // 4. Curated list of hamlets and their files
  const hamletNames = [
    "Ấp 1",
    "Ấp 2",
    "Ấp Trà Kháo",
    "Ấp Bà My",
    "Ấp Giồng Lớn",
    "Ấp Thông Thảo",
    "Ấp Giồng Dầu",
    "Ấp Rùm Sóc",
    "Ấp Ô Mịch",
    "Ấp Ô Tưng",
    "Ấp Châu Hưng",
    "Ấp Ô Rồm",
    "Ấp Xóm Lớn"
  ];

  const hamletColors = {
    "Ấp 1": "#ff4d4d",      // Neon Coral Red
    "Ấp 2": "#ff9f0a",      // Neon Gold
    "Ấp Trà Kháo": "#30d158", // Bright Lime Green
    "Ấp Bà My": "#0a84ff",    // Vibrant Blue
    "Ấp Giồng Lớn": "#5e5ce6", // Electric Indigo
    "Ấp Thông Thảo": "#bf5af2", // Electric Purple
    "Ấp Giồng Dầu": "#ff375f", // Vivid Rose Pink
    "Ấp Rùm Sóc": "#64d2ff",   // Bright Sky Blue
    "Ấp Ô Mịch": "#ffd60a",   // Vibrant Yellow
    "Ấp Ô Tưng": "#00e5ff",   // Radiant Cyan
    "Ấp Châu Hưng": "#a78bfa", // Soft Lavender
    "Ấp Ô Rồm": "#34d399",    // Vibrant Emerald Green
    "Ấp Xóm Lớn": "#f43f5e"    // Vibrant Pink-Red
  };

  let hamletsLayerGroup = L.layerGroup().addTo(map);
  let selectedHamletProperties = null;
  const hamletLayersByName = {};
  const hamletBoundsByName = {};
  let suppressPopupCloseZoomReset = false;
  let zoomToHamletTimer = null;

  function getHamletMapPadding() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return {
        paddingTopLeft: L.point(90, 20),
        paddingBottomRight: L.point(20, window.innerHeight * 0.65 + 15),
      };
    }
    return {
      paddingTopLeft: L.point(50, 50),
      paddingBottomRight: L.point(50, 50),
    };
  }

  function zoomToHamlet(hamletName) {
    const bounds = hamletBoundsByName[hamletName];
    if (!bounds || !bounds.isValid()) return;

    map.stop();
    map.invalidateSize({ animate: false });

    const { paddingTopLeft, paddingBottomRight } = getHamletMapPadding();
    const targetZoom = Math.min(
      map.getBoundsZoom(bounds, false, paddingTopLeft, paddingBottomRight),
      18
    );

    map.flyTo(bounds.getCenter(), targetZoom, {
      animate: true,
      duration: 0.75,
    });
  }

  function scheduleZoomToHamlet(hamletName) {
    if (zoomToHamletTimer) clearTimeout(zoomToHamletTimer);
    zoomToHamletTimer = setTimeout(() => {
      zoomToHamletTimer = null;
      zoomToHamlet(hamletName);
    }, 80);
  }

  function zoomToAllHamlets() {
    if (!hamletsLayerGroup) return;
    const bounds = L.latLngBounds();
    hamletsLayerGroup.eachLayer((l) => bounds.extend(l.getBounds()));
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, {
      padding: window.innerWidth < 768 ? [30, 80] : [80, 80],
      animate: true,
    });
  }

  function getHamletStyle(feature) {
    const name = feature.properties.ten || "";
    const color = hamletColors[name] || "#ff4d4d";
    return {
      color: color,
      weight: 2.0,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.28,
      className: "hamlet-polygon",
    };
  }

  function getHamletHoverStyle(name) {
    const color = hamletColors[name] || "#ff4d4d";
    return {
      color: "#ffffff",
      weight: 3.5,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0.45,
      className: "hamlet-polygon hover",
    };
  }

  // 5. Setup Boundaries and Loading
  // Load Hamlet layers
  Promise.all(
    hamletNames.map((name) =>
      fetch(`map data/${name}.geojson`)
        .then((res) => res.json())
        .then((data) => ({ name, data }))
    )
  )
    .then((results) => {
      const geojsonLayers = [];
      results.forEach(({ name: hamletName, data }) => {
        const layer = L.geoJSON(data, {
          style: getHamletStyle,
          onEachFeature: (feature, featureLayer) => {
            // Bind tooltips
            featureLayer.bindTooltip(
              `<strong>${hamletName}</strong><br><span style="font-size: 12.5px; opacity: 0.85; margin-top: 4px; display: inline-block;"><i class="fas fa-mouse-pointer"></i> Nhấp để xem chi tiết</span>`,
              {
                permanent: false,
                direction: "center",
                className: "custom-map-tooltip",
                opacity: 0.95,
              }
            );

            // Hover effects
            featureLayer.on("mouseover", (e) => {
              const l = e.target;
              l.setStyle(getHamletHoverStyle(hamletName));
              l.bringToFront();
            });

            featureLayer.on("mouseout", (e) => {
              const l = e.target;
              l.setStyle(getHamletStyle(feature));
            });

            // Click event: Mở thông tin Ấp
            featureLayer.on("click", () => {
              const isMobile = window.innerWidth <= 768;

              if (isMobile) {
                openHamletSidebar(feature.properties);
              } else {
                // Trên máy tính: Hiển thị Popup Glassmorphism ngay trên bản đồ
                closeSidebar();
                suppressPopupCloseZoomReset = true;
                map.closePopup();
                suppressPopupCloseZoomReset = false;

                const props = feature.properties;
                const name = props.ten || "Chưa rõ tên";
                const areaHa = parseFloat(props.dien_tich_ha || 0);
                const popVal = parseInt(props.dan_so || 0);
                const hoVal = parseInt(props.so_ho || 0);
                
                const areaFormatted = areaHa.toLocaleString("vi-VN", { minimumFractionDigits: 2 });
                const popFormatted = popVal.toLocaleString("vi-VN");
                const hoFormatted = hoVal.toLocaleString("vi-VN");
                
                let mergerTagsHTML = "";
                const sourceList = props.sap_nhap_tu;
                const isMerged = sourceList && Array.isArray(sourceList) && (sourceList.length > 1 || (sourceList.length === 1 && sourceList[0] !== name));
                
                if (isMerged) {
                  sourceList.forEach(src => {
                    mergerTagsHTML += `<span class="popup-merger-tag"><i class="fas fa-compress-arrows-alt"></i> ${src}</span>`;
                  });
                } else {
                  mergerTagsHTML = `<span class="popup-merger-tag popup-merger-tag-keep"><i class="fas fa-circle-check"></i> Giữ nguyên</span>`;
                }
                
                const popupContent = `
                  <div class="popup-header">
                    <h3 class="popup-title">${name}</h3>
                    <button id="popup-tts-btn" class="popup-tts-btn" title="Nghe thuyết minh giọng nói">
                      <i class="fas fa-volume-up"></i>
                    </button>
                  </div>
                  <div class="popup-stat-grid">
                    <div class="popup-stat-card">
                      <div class="popup-stat-icon"><i class="fas fa-vector-square"></i></div>
                      <div class="popup-stat-value">${areaFormatted}</div>
                      <div class="popup-stat-label">Diện tích (ha)</div>
                    </div>
                    <div class="popup-stat-card">
                      <div class="popup-stat-icon"><i class="fas fa-users"></i></div>
                      <div class="popup-stat-value">${popFormatted}</div>
                      <div class="popup-stat-label">Dân số</div>
                    </div>
                    <div class="popup-stat-card">
                      <div class="popup-stat-icon"><i class="fas fa-house-chimney"></i></div>
                      <div class="popup-stat-value">${hoFormatted}</div>
                      <div class="popup-stat-label">Số hộ</div>
                    </div>
                  </div>
                  <div class="popup-info-section">
                    <div class="popup-info-row">
                      <span class="popup-info-label"><i class="fas fa-landmark"></i> Cấp hành chính:</span>
                      <span class="popup-info-value">Ấp (Cấp 3)</span>
                    </div>
                    <div class="popup-info-row" style="flex-direction: column; align-items: flex-start; gap: 4px; border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                      <span class="popup-info-label"><i class="fas fa-code-merge"></i> Được sáp nhập từ:</span>
                      <div class="popup-merger-tags">${mergerTagsHTML}</div>
                    </div>
                  </div>
                `;
                
                const popup = L.popup({
                  className: "glass-map-popup",
                  maxWidth: 480,
                  minWidth: 440,
                  closeButton: true,
                  autoPan: false,
                  offset: L.point(0, -10)
                })
                .setLatLng(hamletBoundsByName[hamletName].getCenter())
                .setContent(popupContent)
                .openOn(map);

                currentProperties = props;
                
                // Đăng ký sự kiện nút thuyết minh trong popup sau khi Leaflet render xong
                setTimeout(() => {
                  const popupTtsBtn = document.getElementById("popup-tts-btn");
                  if (popupTtsBtn) {
                    popupTtsBtn.addEventListener("click", (evt) => {
                      evt.stopPropagation();
                      if (currentAudio && !currentAudio.paused) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                        currentAudio = null;
                        popupTtsBtn.classList.remove("speaking");
                      } else {
                        speakCommuneInfo(props, popupTtsBtn);
                      }
                    });
                    
                    // Tự động phát âm thanh giới thiệu
                    speakCommuneInfo(props, popupTtsBtn);
                  }
                }, 100);
              }

              scheduleZoomToHamlet(hamletName);

              // Hide hint
              const hintOverlay = document.getElementById("map-hint");
              if (hintOverlay) {
                hintOverlay.style.opacity = "0";
                setTimeout(() => hintOverlay.remove(), 500);
              }
            });
          },
        });
        layer.addTo(hamletsLayerGroup);
        hamletLayersByName[hamletName] = layer;
        hamletBoundsByName[hamletName] = layer.getBounds();
        geojsonLayers.push(layer);
      });

      // Fit bounds of map to all hamlets combined at start
      if (geojsonLayers.length > 0) {
        const bounds = L.latLngBounds();
        geojsonLayers.forEach(l => bounds.extend(l.getBounds()));
        map.fitBounds(bounds, {
          padding: window.innerWidth < 768 ? [30, 30] : [80, 80],
        });
      }
    })
    .catch((err) => console.error("Lỗi khi tải danh sách các ấp:", err));

  // 6. Sidebar Controls & Backdrop
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  // Hide floating sidebar toggle button at start (only show once an ấp is selected)
  if (sidebarToggle && window.innerWidth > 768) {
    sidebarToggle.style.display = "none";
  }

  function openHamletSidebar(props) {
    selectedHamletProperties = props; // Save properties for reopening via toggle button

    sidebar.classList.add("active");
    if (backdrop) backdrop.classList.add("active");

    sidebarToggle.querySelector("i").className = "fas fa-times";
    sidebarToggle.style.display = "none";

    // Header updates
    document.getElementById("commune-name").innerText = props.ten;
    document.getElementById("commune-badge-text").innerText = "Đơn vị cấp Ấp";
    
    // Style badge for Hamlet
    document.getElementById("commune-level-badge").style.borderColor = "rgba(79, 70, 229, 0.25)";
    document.getElementById("commune-level-badge").style.background = "var(--accent-indigo-glow)";
    document.getElementById("commune-level-badge").style.color = "var(--accent-indigo)";
    document.getElementById("commune-level-badge").querySelector("i").className = "fas fa-location-pin";

    // Stat Grid Updates (Renamed metrics dynamically for Hamlet representation!)
    document.getElementById("stat-area-label").innerText = "Diện tích";
    document.getElementById("stat-pop-label").innerText = "Dân số";
    document.getElementById("stat-density-label").innerText = "Số hộ";
    document.getElementById("stat-density-icon").querySelector("i").className = "fas fa-house-chimney";

    const areaHa = parseFloat(props.dien_tich_ha || 0);
    const popVal = parseInt(props.dan_so || 0);
    const hoVal = parseInt(props.so_ho || 0);

    animateValue("stat-area", 0, areaHa, 1000, 2, " ha");
    animateValue("stat-pop", 0, popVal, 1200, 0, " người");
    animateValue("stat-density", 0, hoVal, 1500, 0, " hộ");

    // Show TTS button dynamically when selected
    const ttsBtn = document.getElementById("tts-btn");
    if (ttsBtn) ttsBtn.style.display = "flex";

    // Admin table updates
    document.getElementById("info-type").innerText = "Ấp";
    document.getElementById("info-level").innerText = "Cấp 3";

    // "Được sáp nhập từ:" tags list
    const mergerTitle = document.getElementById("merger-title");
    if (mergerTitle) {
      mergerTitle.innerHTML = `<i class="fas fa-code-merge"></i> Được sáp nhập từ:`;
    }

    const mergerContainer = document.getElementById("info-merger");
    if (mergerContainer) {
      mergerContainer.innerHTML = "";
      const sourceList = props.sap_nhap_tu;
      const isMerged = sourceList && Array.isArray(sourceList) && (sourceList.length > 1 || (sourceList.length === 1 && sourceList[0] !== props.ten));
      
      if (isMerged) {
        sourceList.forEach((sourceName) => {
          const tag = document.createElement("span");
          tag.className = "merger-tag";
          tag.innerHTML = `<i class="fas fa-compress-arrows-alt"></i> ${sourceName}`;
          mergerContainer.appendChild(tag);
        });
      } else {
        const tag = document.createElement("span");
        tag.className = "merger-tag merger-tag-keep";
        tag.innerHTML = `<i class="fas fa-circle-check"></i> Giữ nguyên`;
        mergerContainer.appendChild(tag);
      }
    }

    speakCommuneInfo(props);
  }

  function closeSidebar() {
    const wasActive = sidebar.classList.contains("active");

    // Dừng phát âm thanh giới thiệu khi đóng bảng thông tin
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    const ttsBtn = document.getElementById("tts-btn");
    if (ttsBtn) {
      ttsBtn.classList.remove("speaking");
      ttsBtn.style.display = "none"; // Hide TTS button when sidebar is closed
    }

    sidebar.classList.remove("active");
    if (backdrop) {
      backdrop.classList.remove("active");
      backdrop.style.opacity = ""; // Reset drag opacity
    }
    sidebar.style.transform = ""; // Reset drag transform
    sidebar.style.transition = ""; // Reset transition override
    sidebarToggle.querySelector("i").className = "fas fa-bars";
    
    // Show toggle button only if a hamlet has been selected
    if (selectedHamletProperties) {
      sidebarToggle.style.display = "flex";
    }

    if (wasActive) {
      zoomToAllHamlets();
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
      if (selectedHamletProperties) {
        openHamletSidebar(selectedHamletProperties);
        scheduleZoomToHamlet(selectedHamletProperties.ten);
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

  function speakCommuneInfo(props, buttonEl = null) {
    // Dừng phát âm thanh hiện tại nếu có
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      document.querySelectorAll(".tts-speech-btn, .popup-tts-btn").forEach(btn => btn.classList.remove("speaking"));
    }

    currentProperties = props; // Lưu trữ để phát lại thủ công nếu cần

    const ma = props.ma || "30050";
    const audioPath = `audio/${ma}.mp3`;
    
    currentAudio = new Audio(audioPath);
    
    const activeBtn = buttonEl || document.getElementById("tts-btn");

    currentAudio.addEventListener("play", () => {
      if (activeBtn) activeBtn.classList.add("speaking");
    });

    currentAudio.addEventListener("ended", () => {
      if (activeBtn) activeBtn.classList.remove("speaking");
      currentAudio = null;
    });

    currentAudio.addEventListener("error", (e) => {
      console.error("Lỗi tải/phát âm thanh thuyết minh:", e);
      if (activeBtn) activeBtn.classList.remove("speaking");
      currentAudio = null;
    });

    currentAudio.play().catch((err) => {
      console.warn("Trình duyệt chặn tự động phát âm thanh:", err);
      if (activeBtn) activeBtn.classList.remove("speaking");
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

  // 9. Dừng phát TTS và căn chỉnh bản đồ khi đóng Popup
  map.on("popupclose", (e) => {
    if (e.popup.options.className === "glass-map-popup") {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      document.querySelectorAll(".popup-tts-btn, .tts-speech-btn").forEach(btn => btn.classList.remove("speaking"));
      
      if (!suppressPopupCloseZoomReset) {
        zoomToAllHamlets();
      }
    }
  });
});
