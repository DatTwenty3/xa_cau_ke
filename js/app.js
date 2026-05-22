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
  let hamletLabelsLayerGroup = L.layerGroup().addTo(map);
  let hamletGlowLayerGroup = L.layerGroup().addTo(map);
  let selectedHamletProperties = null;
  let selectedHamletName = null;
  let hamletBlinkTimer = null;
  let hamletBlinkBright = true;
  const HAMLET_BLINK_INTERVAL_MS = 470;
  let hamletGlowLayer = null;
  const hamletLayersByName = {};
  const hamletBoundsByName = {};
  const hamletFeaturesByName = {};
  const hamletFeatureLayersByName = {};
  let zoomToHamletTimer = null;

  function getHamletMapPadding() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return {
        paddingTopLeft: L.point(90, 20),
        paddingBottomRight: L.point(20, window.innerHeight * 0.65 + 15),
      };
    }
    const panelW = Math.min(560, window.innerWidth - 48);
    const panelH = Math.min(580, window.innerHeight * 0.75);
    return {
      paddingTopLeft: L.point(50, 50),
      paddingBottomRight: L.point(panelW + 36, panelH + 36),
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

    const isMobile = window.innerWidth <= 768;
    const isSidebarActive = sidebar && sidebar.classList.contains("active");

    let paddingTopLeft, paddingBottomRight;

    if (isMobile) {
      paddingTopLeft = L.point(20, 20);
      if (isSidebarActive) {
        paddingBottomRight = L.point(20, window.innerHeight * 0.65 + 15);
      } else {
        paddingBottomRight = L.point(20, 20);
      }
    } else {
      paddingTopLeft = L.point(50, 50);
      if (isSidebarActive) {
        const panelW = Math.min(560, window.innerWidth - 48);
        paddingBottomRight = L.point(panelW + 36, 50);
      } else {
        paddingBottomRight = L.point(50, 50);
      }
    }

    map.fitBounds(bounds, {
      paddingTopLeft: paddingTopLeft,
      paddingBottomRight: paddingBottomRight,
      animate: true,
      duration: 0.75,
    });
  }

  function formatHamletName(name) {
    if (!name) return "";
    return String(name).toLocaleUpperCase("vi-VN");
  }

  function normalizeHamletName(name) {
    return String(name || "").trim().toLocaleLowerCase("vi-VN");
  }

  /** Ấp được sáp nhập từ nhiều nguồn; nếu chỉ 1 nguồn trùng tên hiện tại → giữ nguyên. */
  function isHamletMerged(props) {
    const sourceList = props.sap_nhap_tu;
    const ten = props.ten || "";
    if (!sourceList || !Array.isArray(sourceList) || sourceList.length === 0) {
      return false;
    }
    if (sourceList.length > 1) return true;
    return normalizeHamletName(sourceList[0]) !== normalizeHamletName(ten);
  }

  function getMergerSourceNames(props) {
    if (!isHamletMerged(props)) return [];
    return props.sap_nhap_tu;
  }

  function renderMergerTags(container, props) {
    container.innerHTML = "";
    if (!isHamletMerged(props)) {
      const tag = document.createElement("span");
      tag.className = "merger-tag merger-tag-keep";
      tag.innerHTML = `<i class="fas fa-circle-check"></i> Giữ nguyên`;
      container.appendChild(tag);
      return;
    }
    getMergerSourceNames(props).forEach((sourceName) => {
      const tag = document.createElement("span");
      tag.className = "merger-tag";
      tag.innerHTML = `<i class="fas fa-compress-arrows-alt"></i> ${sourceName}`;
      container.appendChild(tag);
    });
  }

  function formatPopulationDensity(props) {
    const pop = parseInt(props.dan_so || 0, 10);
    const km2 = parseFloat(String(props.dien_tich_km2 || 0).replace(",", "."));
    const density =
      km2 > 0
        ? pop / km2
        : parseFloat(String(props.mat_do_km2 || 0).replace(",", "."));
    if (!density || Number.isNaN(density)) return "—";
    return (
      density.toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " người/km²"
    );
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

  const HAMLET_LABEL_OFFSET_X = {
    "Ấp Trà Kháo": 0.02,
  };
  const hamletLabelMarkersByName = {};

  function getLabelLatLng(hamletName, bounds) {
    const center = bounds.getCenter();
    const ratio = HAMLET_LABEL_OFFSET_X[hamletName];
    if (!ratio) return center;
    const point = map.latLngToContainerPoint(center);
    return map.containerPointToLatLng(
      L.point(point.x + window.innerWidth * ratio, point.y)
    );
  }

  function updateOffsetHamletLabels() {
    Object.keys(HAMLET_LABEL_OFFSET_X).forEach((name) => {
      const marker = hamletLabelMarkersByName[name];
      const bounds = hamletBoundsByName[name];
      if (marker && bounds) {
        marker.setLatLng(getLabelLatLng(name, bounds));
      }
    });
  }

  function createHamletLabelMarker(hamletName, bounds) {
    const marker = L.marker(getLabelLatLng(hamletName, bounds), {
      icon: L.divIcon({
        className: "hamlet-map-label-icon",
        html: `<span class="hamlet-map-label">${formatHamletName(hamletName)}</span>`,
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    });
    hamletLabelMarkersByName[hamletName] = marker;
    return marker;
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

  function stopHamletBlink() {
    if (hamletBlinkTimer) {
      clearInterval(hamletBlinkTimer);
      hamletBlinkTimer = null;
    }
    if (hamletGlowLayer) {
      hamletGlowLayerGroup.removeLayer(hamletGlowLayer);
      hamletGlowLayer = null;
    }
  }

  function getHamletBlinkStyle(name, bright) {
    const color = hamletColors[name] || "#ff4d4d";
    if (bright) {
      return {
        color: "#ffffff",
        weight: 6,
        opacity: 1,
        fillColor: color,
        fillOpacity: 0.4,
        className: "hamlet-polygon hamlet-polygon-selected",
      };
    }
    return {
      color: color,
      weight: 2.5,
      opacity: 0.25,
      fillColor: color,
      fillOpacity: 0.18,
      className: "hamlet-polygon hamlet-polygon-selected",
    };
  }

  function updateHamletGlowRing(hamletName, bright) {
    const feature = hamletFeaturesByName[hamletName];
    if (!feature) return;

    const color = hamletColors[hamletName] || "#ff4d4d";
    const glowStyle = {
      color: bright ? "#ffffff" : color,
      weight: bright ? 14 : 5,
      opacity: bright ? 1 : 0.35,
      fillOpacity: 0,
      fill: false,
      className: "hamlet-glow-ring",
    };

    if (!hamletGlowLayer || hamletGlowLayer._hamletName !== hamletName) {
      if (hamletGlowLayer) hamletGlowLayerGroup.removeLayer(hamletGlowLayer);
      hamletGlowLayer = L.geoJSON(feature, {
        interactive: false,
        style: () => glowStyle,
      });
      hamletGlowLayer._hamletName = hamletName;
      hamletGlowLayer.addTo(hamletGlowLayerGroup);
    } else {
      hamletGlowLayer.eachLayer((l) => l.setStyle(glowStyle));
    }
  }

  function applyHamletBlinkFrame() {
    if (!selectedHamletName) return;
    const name = selectedHamletName;
    const feature = hamletFeaturesByName[name];
    const pathLayer = hamletFeatureLayersByName[name];

    updateHamletGlowRing(name, hamletBlinkBright);

    const style = getHamletBlinkStyle(name, hamletBlinkBright);
    if (pathLayer) {
      pathLayer.setStyle(style);
      pathLayer.bringToFront();
    }
    const group = hamletLayersByName[name];
    if (group) {
      group.eachLayer((l) => {
        if (l !== pathLayer) l.setStyle(style);
      });
    }
    if (hamletGlowLayer) hamletGlowLayer.bringToFront();

    hamletBlinkBright = !hamletBlinkBright;
  }

  function startHamletBlink(hamletName) {
    stopHamletBlink();
    selectedHamletName = hamletName;
    hamletBlinkBright = true;
    applyHamletBlinkFrame();
    hamletBlinkTimer = setInterval(applyHamletBlinkFrame, HAMLET_BLINK_INTERVAL_MS);
  }

  function clearHamletSelection() {
    stopHamletBlink();
    const prev = selectedHamletName;
    if (!prev) return;
    const feature = hamletFeaturesByName[prev];
    const pathLayer = hamletFeatureLayersByName[prev];
    if (pathLayer && feature) {
      pathLayer.setStyle(getHamletStyle(feature));
    }
    const group = hamletLayersByName[prev];
    if (group && feature) {
      group.eachLayer((l) => {
        if (l !== pathLayer) l.setStyle(getHamletStyle(feature));
      });
    }
    selectedHamletName = null;
  }

  function selectHamlet(hamletName) {
    clearHamletSelection();
    if (!hamletFeatureLayersByName[hamletName]) return;
    startHamletBlink(hamletName);
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
            hamletFeaturesByName[hamletName] = feature;
            hamletFeatureLayersByName[hamletName] = featureLayer;

            featureLayer.bindTooltip(
              `<span><i class="fas fa-mouse-pointer"></i> Nhấp để xem chi tiết</span>`,
              {
                permanent: false,
                direction: "top",
                className: "custom-map-tooltip",
                opacity: 0.95,
              }
            );

            // Hover effects
            featureLayer.on("mouseover", (e) => {
              if (selectedHamletName === hamletName) return;
              const l = e.target;
              l.setStyle(getHamletHoverStyle(hamletName));
              l.bringToFront();
            });

            featureLayer.on("mouseout", (e) => {
              if (selectedHamletName === hamletName) return;
              e.target.setStyle(getHamletStyle(feature));
            });

            // Click event: Mở thông tin Ấp
            featureLayer.on("click", () => {
              map.closePopup();
              selectHamlet(hamletName);
              openHamletSidebar(feature.properties);
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
        const bounds = layer.getBounds();
        hamletBoundsByName[hamletName] = bounds;
        createHamletLabelMarker(hamletName, bounds).addTo(hamletLabelsLayerGroup);
        geojsonLayers.push(layer);
      });

      // Fit bounds of map to all hamlets combined at start
      if (geojsonLayers.length > 0) {
        const bounds = L.latLngBounds();
        geojsonLayers.forEach(l => bounds.extend(l.getBounds()));
        map.fitBounds(bounds, {
          padding: window.innerWidth < 768 ? [30, 30] : [80, 80],
        });
        map.once("moveend", updateOffsetHamletLabels);
      }
    })
    .catch((err) => console.error("Lỗi khi tải danh sách các ấp:", err));

  map.on("zoomend moveend", updateOffsetHamletLabels);

  // 6. Sidebar Controls & Backdrop
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  const communeProperties = {
    ten: "Cầu Kè",
    loai: "Xã",
    cap: "2",
    dien_tich_km2: "54.12",
    dan_so: "35491",
    so_ho: "8399",
    mat_do_km2: "655.78"
  };

  function updateSidebarToggleButton() {
    if (!sidebarToggle) return;
    const textSpan = document.getElementById("sidebar-toggle-text");
    const iconEl = document.getElementById("sidebar-toggle-icon");
    
    if (sidebar.classList.contains("active")) {
      if (iconEl) iconEl.className = "fas fa-times";
      if (textSpan) textSpan.innerText = "Đóng thông tin";
    } else {
      if (iconEl) {
        if (selectedHamletProperties) {
          iconEl.className = "fas fa-location-pin";
        } else {
          iconEl.className = "fas fa-landmark";
        }
      }
      if (textSpan) {
        if (selectedHamletProperties) {
          textSpan.innerText = `Xem ${selectedHamletProperties.ten}`;
        } else {
          textSpan.innerText = "Xem thông tin xã";
        }
      }
    }
  }

  function openCommuneSidebar() {
    selectedHamletProperties = null;
    clearHamletSelection();

    const isMobile = window.innerWidth <= 768;
    sidebar.classList.add("active");
    if (isMobile && backdrop) backdrop.classList.add("active");

    if (sidebarToggle) {
      sidebarToggle.style.display = "none";
    }

    // Hide back to commune button
    const backBtn = document.getElementById("back-to-commune");
    if (backBtn) backBtn.style.display = "none";

    // Header updates
    document.getElementById("commune-name").innerText = "XÃ CẦU KÈ";
    document.getElementById("commune-badge-text").innerText = "Đơn vị cấp Xã";
    
    // Style badge for Commune
    const badge = document.getElementById("commune-level-badge");
    if (badge) {
      badge.style.borderColor = "rgba(5, 150, 105, 0.25)";
      badge.style.background = "var(--accent-emerald-glow)";
      badge.style.color = "#047857";
      const badgeIcon = badge.querySelector("i");
      if (badgeIcon) badgeIcon.className = "fas fa-shield-halved";
    }

    // Stat Grid Updates
    document.getElementById("stat-area-label").innerText = "Diện tích";
    document.getElementById("stat-pop-label").innerText = "Dân số";
    document.getElementById("stat-density-label").innerText = "Số hộ";
    const densityIcon = document.getElementById("stat-density-icon");
    if (densityIcon) {
      const densityIconI = densityIcon.querySelector("i");
      if (densityIconI) densityIconI.className = "fas fa-house-chimney";
    }

    animateValue("stat-area", 0, parseFloat(communeProperties.dien_tich_km2), 1000, 2, " km²");
    animateValue("stat-pop", 0, parseInt(communeProperties.dan_so), 1200, 0, " người");
    animateValue("stat-density", 0, parseInt(communeProperties.so_ho), 1500, 0, " hộ");

    // Hide TTS button for the whole commune
    const ttsBtn = document.getElementById("tts-btn");
    if (ttsBtn) ttsBtn.style.display = "none";

    // Admin table updates
    document.getElementById("info-type").innerText = "Xã";
    document.getElementById("info-level").innerText = "Cấp 2";
    const densityEl = document.getElementById("info-density");
    if (densityEl) {
      const densityVal = parseFloat(communeProperties.mat_do_km2);
      densityEl.innerText = densityVal.toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " người/km²";
    }

    // "Danh sách các ấp" container
    const mergerTitle = document.getElementById("merger-title");
    if (mergerTitle) {
      mergerTitle.innerHTML = `<i class="fas fa-map-location-dot"></i> Danh sách các ấp:`;
    }

    const mergerContainer = document.getElementById("info-merger");
    if (mergerContainer) {
      mergerContainer.innerHTML = "";
      hamletNames.forEach((hName) => {
        const tag = document.createElement("span");
        tag.className = "merger-tag";
        tag.style.cursor = "pointer";
        tag.innerHTML = `<i class="fas fa-location-dot"></i> ${hName}`;
        tag.addEventListener("click", (e) => {
          e.stopPropagation();
          const layer = hamletFeatureLayersByName[hName];
          if (layer) {
            layer.fire("click");
          }
        });
        mergerContainer.appendChild(tag);
      });
    }

    updateSidebarToggleButton();
  }

  function openHamletSidebar(props) {
    selectedHamletProperties = props;
    currentProperties = props;

    const isMobile = window.innerWidth <= 768;
    sidebar.classList.add("active");
    if (isMobile && backdrop) backdrop.classList.add("active");

    if (sidebarToggle) {
      sidebarToggle.style.display = "none";
    }

    // Show back to commune button inside sidebar
    const backBtn = document.getElementById("back-to-commune");
    if (backBtn) backBtn.style.display = "inline-flex";

    // Header updates
    document.getElementById("commune-name").innerText = formatHamletName(props.ten);
    document.getElementById("commune-badge-text").innerText = "Đơn vị cấp Ấp";
    
    // Style badge for Hamlet
    const badge = document.getElementById("commune-level-badge");
    if (badge) {
      badge.style.borderColor = "rgba(79, 70, 229, 0.25)";
      badge.style.background = "var(--accent-indigo-glow)";
      badge.style.color = "var(--accent-indigo)";
      const badgeIcon = badge.querySelector("i");
      if (badgeIcon) badgeIcon.className = "fas fa-location-pin";
    }

    // Stat Grid Updates (Renamed metrics dynamically for Hamlet representation!)
    document.getElementById("stat-area-label").innerText = "Diện tích";
    document.getElementById("stat-pop-label").innerText = "Dân số";
    document.getElementById("stat-density-label").innerText = "Số hộ";
    const densityIcon = document.getElementById("stat-density-icon");
    if (densityIcon) {
      const densityIconI = densityIcon.querySelector("i");
      if (densityIconI) densityIconI.className = "fas fa-house-chimney";
    }

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
    const densityEl = document.getElementById("info-density");
    if (densityEl) densityEl.innerText = formatPopulationDensity(props);

    // "Được sáp nhập từ:" tags list
    const mergerTitle = document.getElementById("merger-title");
    if (mergerTitle) {
      mergerTitle.innerHTML = `<i class="fas fa-code-merge"></i> Được sáp nhập từ:`;
    }

    const mergerContainer = document.getElementById("info-merger");
    if (mergerContainer) {
      renderMergerTags(mergerContainer, props);
    }

    speakCommuneInfo(props);
    updateSidebarToggleButton();
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

    map.closePopup();
    clearHamletSelection();
    sidebar.classList.remove("active");
    if (backdrop) {
      backdrop.classList.remove("active");
      backdrop.style.opacity = ""; // Reset drag opacity
    }
    sidebar.style.transform = ""; // Reset drag transform
    sidebar.style.transition = ""; // Reset transition override
    
    // Show toggle button
    if (sidebarToggle) {
      sidebarToggle.style.display = "flex";
      updateSidebarToggleButton();
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
      } else {
        openCommuneSidebar();
      }
    }
  });

  const backToCommuneBtn = document.getElementById("back-to-commune");
  if (backToCommuneBtn) {
    backToCommuneBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCommuneSidebar();
      zoomToAllHamlets();
    });
  }

  // Initial setup: Open commune sidebar on desktop, keep closed on mobile
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) {
    openCommuneSidebar();
  } else {
    if (sidebarToggle) {
      sidebarToggle.style.display = "flex";
      updateSidebarToggleButton();
    }
  }

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

});
