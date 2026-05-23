document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Map
  const defaultCenter = [9.914, 106.08];
  const map = L.map("map", {
    zoomControl: false, // Disabling default zoom control to position custom styled one
  }).setView(defaultCenter, 13);



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

  let oldHamletsLayerGroup = L.layerGroup().addTo(map);
  let hamletsLayerGroup = L.layerGroup().addTo(map);
  let hamletGlowLayerGroup = L.layerGroup().addTo(map);
  let hamletLabelsLayerGroup = L.layerGroup().addTo(map);
  let selectedHamletProperties = null;
  let selectedHamletName = null;
  let hamletGlowLayer = null;
  const hamletLayersByName = {};
  const hamletBoundsByName = {};
  const hamletFeaturesByName = {};
  const hamletFeatureLayersByName = {};
  let zoomToHamletTimer = null;
  let oldHamletLabelMarkers = [];

  function getHamletMapPadding() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return {
        paddingTopLeft: L.point(20, 20), // Reduced mobile top padding for better map clearance
        paddingBottomRight: L.point(20, window.innerHeight * 0.50 + 15),
      };
    }
    const panelW = Math.min(420, window.innerWidth - 48);
    const panelH = Math.min(500, window.innerHeight * 0.65);
    return {
      paddingTopLeft: L.point(40, 40),
      paddingBottomRight: L.point(panelW + 32, panelH + 32),
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
        paddingBottomRight = L.point(20, window.innerHeight * 0.50 + 15);
      } else {
        paddingBottomRight = L.point(20, 20);
      }
    } else {
      paddingTopLeft = L.point(40, 40);
      if (isSidebarActive) {
        const panelW = Math.min(420, window.innerWidth - 48);
        paddingBottomRight = L.point(panelW + 32, 40);
      } else {
        paddingBottomRight = L.point(40, 40);
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

  const HAMLET_LABEL_CENTERS = {
    "Ấp 1": [9.87591, 106.05837],
    "Ấp 2": [9.86528, 106.06498],
    "Ấp Trà Kháo": [9.88626, 106.08059],
    "Ấp Bà My": [9.89267, 106.05308],
    "Ấp Giồng Lớn": [9.87799, 106.06998],
    "Ấp Thông Thảo": [9.90806, 106.08577],
    "Ấp Giồng Dầu": [9.91009, 106.07013],
    "Ấp Rùm Sóc": [9.83196, 106.06385],
    "Ấp Ô Mịch": [9.84556, 106.06685],
    "Ấp Ô Tưng": [9.86507, 106.08031],
    "Ấp Châu Hưng": [9.89199, 106.10055],
    "Ấp Ô Rồm": [9.86559, 106.11447],
    "Ấp Xóm Lớn": [9.88916, 106.12291]
  };
  const hamletLabelMarkersByName = {};

  // HUD (Heads-Up Display) controller
  const mapHud = document.getElementById("map-hud");
  const hudText = document.getElementById("hud-text");
  const hudAccent = mapHud ? mapHud.querySelector(".hud-accent") : null;

  function updateMapHUD(hamletName, mode) {
    if (!mapHud || !hudText) return;

    if (hamletName && (mode === "hover" || mode === "selected")) {
      const color = hamletColors[hamletName] || "var(--accent-indigo)";
      hudText.innerText = formatHamletName(hamletName);
      mapHud.classList.add("inspecting");
      if (hudAccent) {
        hudAccent.style.backgroundColor = color;
        hudAccent.style.boxShadow = `0 0 12px ${color}`;
      }
    } else {
      // Revert to general commune or selected hamlet if exists
      if (selectedHamletName) {
        const color = hamletColors[selectedHamletName] || "var(--accent-indigo)";
        hudText.innerText = formatHamletName(selectedHamletName);
        mapHud.classList.add("inspecting");
        if (hudAccent) {
          hudAccent.style.backgroundColor = color;
          hudAccent.style.boxShadow = `0 0 12px ${color}`;
        }
      } else {
        hudText.innerText = "XÃ CẦU KÈ";
        mapHud.classList.remove("inspecting");
        if (hudAccent) {
          hudAccent.style.backgroundColor = "var(--accent-emerald)";
          hudAccent.style.boxShadow = "0 0 12px var(--accent-emerald)";
        }
      }
    }
  }

  function createHamletLabelMarker(hamletName, bounds) {
    const centerCoords = HAMLET_LABEL_CENTERS[hamletName] || [bounds.getCenter().lat, bounds.getCenter().lng];
    const latlng = L.latLng(centerCoords[0], centerCoords[1]);

    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: "hamlet-map-label-icon",
        html: `<span class="hamlet-map-label" data-hamlet="${hamletName}">${formatHamletName(hamletName)}</span>`,
      }),
      interactive: true,
      keyboard: false,
      zIndexOffset: 1000,
    });

    // Khi marker được thêm vào bản đồ, đồng bộ ngay trạng thái hiển thị
    marker.on("add", () => {
      const el = marker.getElement();
      if (el) {
        const span = el.querySelector(".hamlet-map-label");
        if (span) {
          if (selectedHamletName === hamletName) {
            span.classList.add("selected");
            const color = hamletColors[hamletName] || "#ffffff";
            span.style.setProperty("--label-glow-color", color);
          }
          // Gọi hàm updateOffset để áp dụng đúng font size theo mức zoom hiện tại
          setTimeout(updateOffsetHamletLabels, 10);
        }
      }
    });

    // Đồng bộ rê chuột trên nhãn chữ -> kích hoạt ranh giới polygon ấp
    marker.on("mouseover", () => {
      clearAllHoverStates();
      const pathLayer = hamletFeatureLayersByName[hamletName];
      if (pathLayer && selectedHamletName !== hamletName) {
        pathLayer.setStyle(getHamletHoverStyle(hamletName));
        pathLayer.bringToFront();
      }
      highlightLabel(hamletName, true);
      updateMapHUD(hamletName, "hover");
    });

    marker.on("mouseout", () => {
      const pathLayer = hamletFeatureLayersByName[hamletName];
      const feature = hamletFeaturesByName[hamletName];
      if (pathLayer && feature && selectedHamletName !== hamletName) {
        pathLayer.setStyle(getHamletStyle(feature));
      }
      highlightLabel(hamletName, false);
      updateMapHUD(null, "hover");
    });

    // Đồng bộ click trên nhãn chữ -> Zoom và hiển thị thông tin chi tiết
    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      const pathLayer = hamletFeatureLayersByName[hamletName];
      const feature = hamletFeaturesByName[hamletName];
      if (pathLayer && feature) {
        map.closePopup();
        selectHamlet(hamletName);
        openHamletSidebar(feature.properties);
        scheduleZoomToHamlet(hamletName);
      }
    });

    hamletLabelMarkersByName[hamletName] = marker;
    return marker;
  }

  // Hàm xóa mọi trạng thái phát sáng và hover của các nhãn và polygon ấp chưa chọn
  function clearAllHoverStates() {
    Object.keys(hamletLabelMarkersByName).forEach((name) => {
      const marker = hamletLabelMarkersByName[name];
      if (marker) {
        const element = marker.getElement();
        if (element) {
          const span = element.querySelector(".hamlet-map-label");
          if (span) {
            span.classList.remove("hover");
            if (selectedHamletName !== name) {
              span.style.removeProperty("--label-glow-color");
            }
          }
        }
      }
      const pathLayer = hamletFeatureLayersByName[name];
      const feature = hamletFeaturesByName[name];
      if (pathLayer && feature && selectedHamletName !== name) {
        pathLayer.setStyle(getHamletStyle(feature));
      }
    });
  }

  // Hàm phát sáng nhãn chữ theo màu đặc trưng khi di chuột
  function highlightLabel(hamletName, isHighlighted) {
    const marker = hamletLabelMarkersByName[hamletName];
    if (!marker) return;
    const element = marker.getElement();
    if (!element) return;
    const span = element.querySelector(".hamlet-map-label");
    if (!span) return;

    if (isHighlighted) {
      span.classList.add("hover");
      const color = hamletColors[hamletName] || "#ffffff";
      span.style.setProperty("--label-glow-color", color);
    } else {
      span.classList.remove("hover");
      if (selectedHamletName !== hamletName) {
        span.style.removeProperty("--label-glow-color");
      }
    }
  }

  // Quản lý trạng thái nhãn được chọn
  function selectLabel(hamletName, isSelected) {
    // Reset toàn bộ nhãn khác
    Object.keys(hamletLabelMarkersByName).forEach((name) => {
      const marker = hamletLabelMarkersByName[name];
      if (marker) {
        const element = marker.getElement();
        if (element) {
          const span = element.querySelector(".hamlet-map-label");
          if (span) {
            span.classList.remove("selected");
            if (selectedHamletName !== name) {
              span.style.removeProperty("--label-glow-color");
            }
          }
        }
      }
    });

    if (isSelected) {
      const marker = hamletLabelMarkersByName[hamletName];
      if (!marker) return;
      const element = marker.getElement();
      if (!element) return;
      const span = element.querySelector(".hamlet-map-label");
      if (!span) return;

      span.classList.add("selected");
      const color = hamletColors[hamletName] || "#ffffff";
      span.style.setProperty("--label-glow-color", color);
    }
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

  function stopHamletHighlight() {
    if (hamletGlowLayer) {
      hamletGlowLayerGroup.removeLayer(hamletGlowLayer);
      hamletGlowLayer = null;
    }
  }

  function updateHamletGlowRing(hamletName) {
    const feature = hamletFeaturesByName[hamletName];
    if (!feature) return;

    const color = hamletColors[hamletName] || "#ff4d4d";
    const glowStyle = {
      color: "#ffffff",
      weight: 13,
      opacity: 0.8,
      fillOpacity: 0,
      fill: false,
      className: "hamlet-glow-ring",
    };

    if (hamletGlowLayer) {
      hamletGlowLayerGroup.removeLayer(hamletGlowLayer);
    }
    
    hamletGlowLayer = L.geoJSON(feature, {
      interactive: false,
      style: () => glowStyle,
    });
    hamletGlowLayer._hamletName = hamletName;
    hamletGlowLayer.addTo(hamletGlowLayerGroup);

    // Apply the CSS variable on glow layer DOM element
    hamletGlowLayer.eachLayer((layer) => {
      if (layer._path) {
        layer._path.style.setProperty("--glow-color", color);
      }
    });
  }

  function clearHamletSelection() {
    stopHamletHighlight();
    const prev = selectedHamletName;
    
    // Đồng bộ nhãn chữ về trạng thái thường
    selectLabel(null, false);

    if (!prev) return;
    const feature = hamletFeaturesByName[prev];
    const pathLayer = hamletFeatureLayersByName[prev];
    if (pathLayer && feature) {
      pathLayer.setStyle(getHamletStyle(feature));
      if (pathLayer._path) {
        pathLayer._path.classList.remove("hamlet-polygon-selected");
        pathLayer._path.style.removeProperty("--selected-color");
      }
    }
    const group = hamletLayersByName[prev];
    if (group && feature) {
      group.eachLayer((l) => {
        if (l !== pathLayer) {
          l.setStyle(getHamletStyle(feature));
          if (l._path) {
            l._path.classList.remove("hamlet-polygon-selected");
            l._path.style.removeProperty("--selected-color");
          }
        }
      });
    }
    selectedHamletName = null;
  }

  function selectHamlet(hamletName) {
    clearHamletSelection();
    
    selectedHamletName = hamletName;
    
    // Đồng bộ nhãn chữ sang trạng thái được chọn
    selectLabel(hamletName, true);

    const feature = hamletFeaturesByName[hamletName];
    const pathLayer = hamletFeatureLayersByName[hamletName];
    
    if (pathLayer && feature) {
      const color = hamletColors[hamletName] || "#ff4d4d";
      
      // Set highlighting styles
      pathLayer.setStyle({
        color: "#ffffff", // Sharp white border
        weight: 5.0,
        opacity: 0.95,
        fillColor: color,
        fillOpacity: 0.49,
        className: "hamlet-polygon hamlet-polygon-selected",
      });
      pathLayer.bringToFront();

      // Dynamically add selection animation class and custom color property
      if (pathLayer._path) {
        pathLayer._path.style.setProperty("--selected-color", color);
        pathLayer._path.classList.add("hamlet-polygon-selected");
      }

      // Add the smooth background glow pulsing halo
      updateHamletGlowRing(hamletName);
      
      if (hamletGlowLayer) {
        hamletGlowLayer.bringToFront();
      }
    }
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

            // Hover effects
            featureLayer.on("mouseover", (e) => {
              if (selectedHamletName === hamletName) return;
              clearAllHoverStates();
              const l = e.target;
              l.setStyle(getHamletHoverStyle(hamletName));
              l.bringToFront();
              highlightLabel(hamletName, true);
              updateMapHUD(hamletName, "hover");
            });

            featureLayer.on("mouseout", (e) => {
              if (selectedHamletName === hamletName) return;
              e.target.setStyle(getHamletStyle(feature));
              highlightLabel(hamletName, false);
              updateMapHUD(null, "hover");
            });

            // Click event: Mở thông tin Ấp
            featureLayer.on("click", () => {
              map.closePopup();
              selectHamlet(hamletName);
              openHamletSidebar(feature.properties);
              scheduleZoomToHamlet(hamletName);
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

  // Load Old Hamlet Boundaries (shown underneath new hamlets)
  const oldHamletNames = [
    "Ấp Trà Bôn",
    "Ấp Xóm Lớn",
    "Ấp Ô Tưng A",
    "Ấp Ô Tưng B"
  ];

  oldHamletNames.forEach((name) => {
    fetch(`map data/ranh gioi ap cu/${encodeURIComponent(name)}.geojson`)
      .then((res) => res.json())
      .then((data) => {
        const geojsonLayer = L.geoJSON(data, {
          style: {
            color: "#ffffff",
            weight: 2.2,
            opacity: 0.95,
            fill: false,
            interactive: false
          }
        }).addTo(oldHamletsLayerGroup);

        // Tạo nhãn tên cho ranh giới ấp cũ
        const bounds = geojsonLayer.getBounds();
        if (bounds.isValid()) {
          const latlng = bounds.getCenter();
          
          // Dịch chuyển nhẹ tọa độ nhãn để tránh đè trực tiếp lên nhãn mới
          let offsetLatlng = latlng;
          if (name === "Ấp Xóm Lớn") {
            offsetLatlng = L.latLng(latlng.lat - 0.002, latlng.lng + 0.001);
          } else if (name === "Ấp Trà Bôn") {
            offsetLatlng = L.latLng(latlng.lat + 0.001, latlng.lng - 0.001);
          } else if (name === "Ấp Ô Tưng B") {
            offsetLatlng = L.latLng(latlng.lat - 0.001, latlng.lng + 0.001);
          }

          const labelText = `${formatHamletName(name)} (ẤP CŨ)`;
          const marker = L.marker(offsetLatlng, {
            icon: L.divIcon({
              className: "hamlet-map-label-icon",
              html: `<span class="hamlet-map-label old-hamlet-map-label">${labelText}</span>`,
            }),
            interactive: false,
            keyboard: false,
            zIndexOffset: 500
          }).addTo(hamletLabelsLayerGroup);

          oldHamletLabelMarkers.push(marker);
        }
      })
      .catch((err) => console.error(`Lỗi khi tải ranh giới ấp cũ ${name}:`, err));
  });

  // Tự động thu phóng/ẩn nhãn theo mức độ zoom để bản đồ luôn thoáng đạt
  function updateOffsetHamletLabels() {
    const zoom = map.getZoom();
    Object.keys(hamletLabelMarkersByName).forEach((hamletName) => {
      const marker = hamletLabelMarkersByName[hamletName];
      if (!marker) return;
      const element = marker.getElement();
      if (!element) return;
      const span = element.querySelector(".hamlet-map-label");
      if (!span) return;

      const isMobile = window.innerWidth <= 768;

      if (zoom < 12) {
        // Thu nhỏ hoàn toàn và ẩn đi khi zoom quá xa
        span.style.opacity = "0";
        span.style.transform = "translate(-50%, -50%) scale(0.5)";
        span.style.pointerEvents = "none";
      } else if (zoom === 12) {
        // Bắt đầu hiển thị rất nhỏ
        span.style.opacity = "0.7";
        span.style.fontSize = "5px";
        span.style.padding = "1.5px 3px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(0.8)";
        }
      } else if (zoom === 13) {
        // Zoom mặc định chuẩn
        span.style.opacity = "1";
        span.style.fontSize = isMobile ? "6px" : "8px";
        span.style.padding = isMobile ? "2px 4px" : "2.5px 6px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(1)";
        }
      } else if (zoom === 14) {
        // Phóng to nhẹ khi bắt đầu cận cảnh
        span.style.opacity = "1";
        span.style.fontSize = isMobile ? "6.5px" : "8px";
        span.style.padding = isMobile ? "2px 5px" : "3px 7px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(1.05)";
        }
      } else {
        // Zoom cận cảnh tối đa
        span.style.opacity = "1";
        span.style.fontSize = isMobile ? "7px" : "9px";
        span.style.padding = isMobile ? "2.5px 6px" : "4px 8px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(1.1)";
        }
      }
    });

    // Tự động thu phóng/ẩn nhãn ấp cũ theo mức độ zoom (nhỏ hơn 20%)
    oldHamletLabelMarkers.forEach((marker) => {
      if (!marker) return;
      const element = marker.getElement();
      if (!element) return;
      const span = element.querySelector(".old-hamlet-map-label");
      if (!span) return;

      if (zoom < 12) {
        span.style.opacity = "0";
        span.style.transform = "translate(-50%, -50%) scale(0.4)";
      } else if (zoom === 12) {
        span.style.opacity = "0.6";
        span.style.fontSize = "4px";
        span.style.padding = "1px 2px";
        span.style.transform = "translate(-50%, -50%) scale(0.64)";
      } else if (zoom === 13) {
        span.style.opacity = "0.85";
        span.style.fontSize = isMobile ? "4.8px" : "6.4px";
        span.style.padding = isMobile ? "1.6px 3.2px" : "2px 4.8px";
        span.style.transform = "translate(-50%, -50%) scale(0.8)";
      } else if (zoom === 14) {
        span.style.opacity = "0.85";
        span.style.fontSize = isMobile ? "5.2px" : "6.4px";
        span.style.padding = isMobile ? "1.6px 4px" : "2.4px 5.6px";
        span.style.transform = "translate(-50%, -50%) scale(0.84)";
      } else {
        span.style.opacity = "0.85";
        span.style.fontSize = isMobile ? "5.6px" : "7.2px";
        span.style.padding = isMobile ? "2px 4.8px" : "3.2px 6.4px";
        span.style.transform = "translate(-50%, -50%) scale(0.88)";
      }
    });
  }

  map.on("zoomend moveend", updateOffsetHamletLabels);

  // Khôi phục trạng thái thường khi chuột di chuyển trên nền bản đồ trống hoặc ra ngoài bản đồ
  map.on("mousemove", (e) => {
    if (e.originalEvent && e.originalEvent.target) {
      const target = e.originalEvent.target;
      const isOverInteractive = target.closest('.leaflet-marker-icon') || 
                                target.closest('.leaflet-interactive') ||
                                target.classList.contains('hamlet-polygon') ||
                                target.classList.contains('hamlet-map-label');
      if (!isOverInteractive) {
        clearAllHoverStates();
        updateMapHUD(null, "hover");
      }
    }
  });

  map.on("mouseout", (e) => {
    if (!e.originalEvent || !e.originalEvent.relatedTarget || !map.getContainer().contains(e.originalEvent.relatedTarget)) {
      clearAllHoverStates();
      updateMapHUD(null, "hover");
    }
  });

  // 6. Sidebar Controls & Backdrop
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const minimizeSidebarBtn = document.getElementById("minimize-sidebar");
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
    if (isMobile) {
      sidebar.classList.add("minimized");
      if (backdrop) backdrop.classList.remove("active");
    } else {
      sidebar.classList.remove("minimized");
    }
    updateMinimizeButtonState();

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
      badge.style.borderColor = "rgba(207, 77, 3, 0.25)";
      badge.style.background = "var(--accent-emerald-glow)";
      badge.style.color = "var(--accent-emerald)";
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

    // Disable global TTS button for the whole commune
    const globalTtsBtn = document.getElementById("tts-global-btn");
    if (globalTtsBtn) {
      globalTtsBtn.classList.add("disabled");
      globalTtsBtn.classList.remove("speaking");
      globalTtsBtn.title = "Chọn một ấp để nghe thuyết minh";
      const icon = globalTtsBtn.querySelector("i");
      if (icon) icon.className = "fas fa-volume-xmark";
    }

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
    if (isMobile) {
      sidebar.classList.add("minimized");
      if (backdrop) backdrop.classList.remove("active");
    } else {
      sidebar.classList.remove("minimized");
    }
    updateMinimizeButtonState();

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
      badge.style.borderColor = "rgba(15, 43, 92, 0.25)";
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

    // Enable global TTS button dynamically when selected
    const globalTtsBtn = document.getElementById("tts-global-btn");
    if (globalTtsBtn) {
      globalTtsBtn.classList.remove("disabled");
      globalTtsBtn.title = "Bật/Tắt âm thanh thuyết minh";
    }

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
    const globalTtsBtn = document.getElementById("tts-global-btn");
    if (globalTtsBtn) {
      globalTtsBtn.classList.remove("speaking");
      globalTtsBtn.classList.add("disabled");
      globalTtsBtn.title = "Chọn một ấp để nghe thuyết minh";
      const icon = globalTtsBtn.querySelector("i");
      if (icon) icon.className = "fas fa-volume-xmark";
    }

    map.closePopup();
    clearHamletSelection();
    sidebar.classList.remove("active");
    sidebar.classList.remove("minimized");
    updateMinimizeButtonState();
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

  function updateMinimizeButtonState() {
    if (!minimizeSidebarBtn) return;
    const icon = minimizeSidebarBtn.querySelector("i");
    if (sidebar.classList.contains("minimized")) {
      if (icon) icon.className = "fas fa-expand-alt";
      minimizeSidebarBtn.title = "Phóng to bảng";
    } else {
      if (icon) icon.className = "fas fa-compress-alt";
      minimizeSidebarBtn.title = "Thu nhỏ bảng";
    }
  }

  if (minimizeSidebarBtn) {
    minimizeSidebarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("minimized");
      updateMinimizeButtonState();
      
      const isMobile = window.innerWidth <= 768;
      if (isMobile && backdrop) {
        if (sidebar.classList.contains("minimized")) {
          backdrop.classList.remove("active");
        } else {
          backdrop.classList.add("active");
        }
      }
    });
  }

  // Click vào sidebar header để phục hồi nếu đang thu nhỏ
  const sidebarHeaderEl = document.querySelector(".sidebar-header");
  if (sidebarHeaderEl) {
    sidebarHeaderEl.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (sidebar.classList.contains("minimized")) {
        sidebar.classList.remove("minimized");
        updateMinimizeButtonState();
        
        const isMobile = window.innerWidth <= 768;
        if (isMobile && backdrop) {
          backdrop.classList.add("active");
        }
      }
    });
  }

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
      document.querySelectorAll(".tts-speech-btn, .popup-tts-btn, .sound-toggle-btn").forEach(btn => {
        btn.classList.remove("speaking");
        if (btn.id === "tts-global-btn") {
          const icon = btn.querySelector("i");
          if (icon) icon.className = "fas fa-volume-xmark";
        }
      });
    }

    currentProperties = props; // Lưu trữ để phát lại thủ công nếu cần

    const ma = props.ma || "30050";
    const audioPath = `audio/${ma}.mp3`;
    
    currentAudio = new Audio(audioPath);
    
    const activeBtn = buttonEl || document.getElementById("tts-global-btn");

    currentAudio.addEventListener("play", () => {
      if (activeBtn) {
        activeBtn.classList.add("speaking");
        if (activeBtn.id === "tts-global-btn") {
          const icon = activeBtn.querySelector("i");
          if (icon) icon.className = "fas fa-volume-high";
        }
      }
    });

    currentAudio.addEventListener("ended", () => {
      if (activeBtn) {
        activeBtn.classList.remove("speaking");
        if (activeBtn.id === "tts-global-btn") {
          const icon = activeBtn.querySelector("i");
          if (icon) icon.className = "fas fa-volume-xmark";
        }
      }
      currentAudio = null;
    });

    currentAudio.addEventListener("error", (e) => {
      console.error("Lỗi tải/phát âm thanh thuyết minh:", e);
      if (activeBtn) {
        activeBtn.classList.remove("speaking");
        if (activeBtn.id === "tts-global-btn") {
          const icon = activeBtn.querySelector("i");
          if (icon) icon.className = "fas fa-volume-xmark";
        }
      }
      currentAudio = null;
    });

    currentAudio.play().catch((err) => {
      console.warn("Trình duyệt chặn tự động phát âm thanh:", err);
      if (activeBtn) {
        activeBtn.classList.remove("speaking");
        if (activeBtn.id === "tts-global-btn") {
          const icon = activeBtn.querySelector("i");
          if (icon) icon.className = "fas fa-volume-xmark";
        }
      }
    });
  }

  // Thiết lập trình bắt sự kiện click cho nút loa phát thanh điều khiển thủ công
  const globalTtsBtn = document.getElementById("tts-global-btn");
  if (globalTtsBtn) {
    globalTtsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (globalTtsBtn.classList.contains("disabled")) return;

      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        globalTtsBtn.classList.remove("speaking");
        const icon = globalTtsBtn.querySelector("i");
        if (icon) icon.className = "fas fa-volume-xmark";
      } else if (currentProperties) {
        speakCommuneInfo(currentProperties, globalTtsBtn);
      }
    });
  }

});
