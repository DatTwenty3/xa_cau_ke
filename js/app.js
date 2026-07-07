document.addEventListener("DOMContentLoaded", () => {
  // 0. Welcome/Intro Loading Screen Logic
  const introOverlay = document.getElementById("intro-overlay");
  const introEnterBtn = document.getElementById("intro-enter-btn");
  const introCard = introOverlay ? introOverlay.querySelector(".intro-card") : null;

  let introAudio = new Audio();
  introAudio.src = "audio/intro.mp3";
  introAudio.preload = "auto";
  introAudio.load(); // Chủ động tải âm thanh ngay lập tức
  
  let isIntroPlaying = false;
  let isPlayPending = false;

  if (introOverlay && introCard) {
    // Show intro overlay with smooth entry scale and fade-in animation
    setTimeout(() => {
      introCard.style.opacity = "1";
      introCard.style.transform = "scale(1) translateY(0)";
    }, 150);

    // Hàm cập nhật trạng thái giao diện nút Khám phá Bản đồ
    const updateEnterButtonUI = (isPlaying) => {
      if (!introEnterBtn) return;
      if (isPlaying) {
        introEnterBtn.classList.add("speaking");
        introEnterBtn.innerHTML = `
          <div class="audio-waves">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>Đang giới thiệu...</span>
        `;
      } else {
        introEnterBtn.classList.remove("speaking");
        introEnterBtn.innerHTML = `<span>Khám phá Bản đồ</span> <i class="fas fa-arrow-right"></i>`;
      }
    };

    // Lắng nghe các sự kiện của Audio để đồng bộ hóa giao diện nút
    introAudio.addEventListener("play", () => {
      isIntroPlaying = true;
      updateEnterButtonUI(true);
    });

    introAudio.addEventListener("pause", () => {
      isIntroPlaying = false;
      updateEnterButtonUI(false);
    });

    // Enter Map Transition Handler
    const enterMap = () => {
      introAudio.pause();
      introAudio.currentTime = 0;
      isIntroPlaying = false;
      
      introCard.style.transform = "scale(0.95) translateY(-30px)";
      introCard.style.opacity = "0";
      introOverlay.style.opacity = "0";
      
      setTimeout(() => {
        introOverlay.style.display = "none";
      }, 800);
    };

    // Xử lý sự kiện click của nút Khám phá Bản đồ
    const handleEnterBtnClick = (e) => {
      if (e) e.stopPropagation();
      
      if (isIntroPlaying) {
        // Nhạc đang phát, không cho phép bấm bỏ qua thuyết minh
        return;
      } else {
        // Nếu nhạc chưa phát, bắt đầu phát audio
        if (isPlayPending) return;
        isPlayPending = true;
        
        introAudio.play()
          .then(() => {
            isPlayPending = false;
          })
          .catch((err) => {
            isPlayPending = false;
            console.log("Interactive audio play blocked:", err);
            // Phòng hờ nếu có lỗi trình duyệt vẫn không thể phát nhạc thì cho vào thẳng bản đồ
            enterMap();
          });
      }
    };

    if (introEnterBtn) {
      // Ngăn chặn sự kiện touchstart nổi bọt khi nhấp vào nút Khám phá bản đồ
      introEnterBtn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
      }, { passive: true });
      introEnterBtn.addEventListener("click", handleEnterBtnClick);
    }
    
    // Auto transition to map once narration is completed
    introAudio.addEventListener("ended", () => {
      setTimeout(enterMap, 800);
    });

    // 3. Initialize Three.js Holographic Rotating 3D Globe Background
    if (typeof THREE !== "undefined") {
      const globeContainer = document.getElementById("globe-canvas-container");
      if (globeContainer) {
        const isMobileDevice = window.innerWidth <= 768;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, globeContainer.clientWidth / globeContainer.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

        renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2.0)); // Optimize pixel ratio on mobile for battery and heat
        globeContainer.appendChild(renderer.domElement);

        // Create Holographic Wireframe Globe (Optimized segments on mobile)
        const sphereSegments = isMobileDevice ? 18 : 24;
        const geometry = new THREE.SphereGeometry(3, sphereSegments, sphereSegments);
        
        // Wireframe grid lines (electric deep blue)
        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: 0x0f2b5c,
          wireframe: true,
          transparent: true,
          opacity: 0.14
        });
        const globeWire = new THREE.Mesh(geometry, wireframeMaterial);
        scene.add(globeWire);

        // Grid star nodes (radiant dark orange)
        const pointsMaterial = new THREE.PointsMaterial({
          color: 0xcf4d03,
          size: 0.09,
          transparent: true,
          opacity: 0.85
        });
        const globePoints = new THREE.Points(geometry, pointsMaterial);
        scene.add(globePoints);

        // Outer glow atmosphere (coral dark orange aura)
        const outerGeometry = new THREE.SphereGeometry(3.08, 12, 12);
        const outerMaterial = new THREE.MeshBasicMaterial({
          color: 0xcf4d03,
          wireframe: true,
          transparent: true,
          opacity: 0.08
        });
        const outerGlobe = new THREE.Mesh(outerGeometry, outerMaterial);
        scene.add(outerGlobe);

        // 1. Drifting Space Starfield (150 Deep Blue Stars)
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 150;
        const starPositions = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount * 3; i += 3) {
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          const r = 8.5 + Math.random() * 3.5; // Place stars between radius 8.5 and 12
          starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
          starPositions[i+1] = r * Math.sin(phi) * Math.sin(theta);
          starPositions[i+2] = r * Math.cos(phi);
        }
        starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
        const starsMaterial = new THREE.PointsMaterial({
          color: 0x0f2b5c,
          size: 0.05,
          transparent: true,
          opacity: 0.25
        });
        const starfield = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(starfield);

        // 2. Futuristic Orbital Satellite Tracks (GIS Constellations)
        const orbitsGroup = new THREE.Group();
        scene.add(orbitsGroup);

        const ringGeom = new THREE.RingGeometry(3.4, 3.415, 50);
        
        // Orbit Path 1 (deep blue)
        const ringMat1 = new THREE.MeshBasicMaterial({
          color: 0x0f2b5c,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.18
        });
        const orbit1 = new THREE.Mesh(ringGeom, ringMat1);
        orbit1.rotation.x = Math.PI / 3;
        orbitsGroup.add(orbit1);

        // Orbit Path 2 (dark orange)
        const ringMat2 = new THREE.MeshBasicMaterial({
          color: 0xcf4d03,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.16
        });
        const orbit2 = new THREE.Mesh(ringGeom, ringMat2);
        orbit2.rotation.x = -Math.PI / 4;
        orbit2.rotation.y = Math.PI / 6;
        orbitsGroup.add(orbit2);

        // Blinking tech satellite node on Orbit 1
        const satGeom = new THREE.SphereGeometry(0.09, 8, 8);
        const satMat = new THREE.MeshBasicMaterial({ color: 0xff7a00 });
        const satellite = new THREE.Mesh(satGeom, satMat);
        satellite.position.x = 3.4; // Anchor onto Orbit 1 radius
        orbit1.add(satellite);

        camera.position.z = isMobileDevice ? 8.2 : 6; // Move camera back on mobile to fit the globe beautifully in portrait aspect ratio

        let animationFrameId;
        let time = 0;
        const animateGlobe = () => {
          animationFrameId = requestAnimationFrame(animateGlobe);
          time += 0.012;

          // Rotate Globe core
          globeWire.rotation.y += 0.0015;
          globeWire.rotation.x += 0.0004;
          globePoints.rotation.y += 0.0015;
          globePoints.rotation.x += 0.0004;

          // Rotate satellite orbit tracks at differing speeds
          orbit1.rotation.z += 0.0025;
          orbit2.rotation.z -= 0.0035;
          orbitsGroup.rotation.y += 0.0006;

          // Rotate starfield slowly to show cosmic movement
          starfield.rotation.y += 0.0002;
          starfield.rotation.x += 0.0001;

          // Breathes the outer atmospheric forcefield (pulsing Sine wave)
          const pulse = 1.0 + Math.sin(time) * 0.025;
          outerGlobe.scale.setScalar(pulse);
          outerGlobe.rotation.y -= 0.0008;

          renderer.render(scene, camera);
        };
        animateGlobe();

        // Responsive resizing
        const onGlobeResize = () => {
          const isMobileNow = window.innerWidth <= 768;
          camera.aspect = globeContainer.clientWidth / globeContainer.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
          camera.position.z = isMobileNow ? 8.2 : 6; // Dynamically adjust on screen rotate / resize
        };
        window.addEventListener("resize", onGlobeResize);

        // Smart performance cleanup observer
        const destroyObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === "style" && introOverlay.style.display === "none") {
              cancelAnimationFrame(animationFrameId);
              
              // Thorough memory cleanup of geometries and materials to avoid WebGL memory leaks
              geometry.dispose();
              wireframeMaterial.dispose();
              pointsMaterial.dispose();
              outerGeometry.dispose();
              outerMaterial.dispose();
              starsGeometry.dispose();
              starsMaterial.dispose();
              ringGeom.dispose();
              ringMat1.dispose();
              ringMat2.dispose();
              satGeom.dispose();
              satMat.dispose();

              renderer.dispose();
              window.removeEventListener("resize", onGlobeResize);
              destroyObserver.disconnect();
              globeContainer.remove();
            }
          });
        });
        destroyObserver.observe(introOverlay, { attributes: true });
      }
    }
  }

  // 1. Initialize Map
  let defaultCenter = [9.914, 106.08];
  let defaultZoom = 13;
  const map = L.map("map", {
    zoomControl: false, // Disabling default zoom control to position custom styled one
    tap: false,         // Disables Leaflet's custom tap handler to restore reliable native click handling on mobile
  }).setView(defaultCenter, defaultZoom);

  // Tạo các pane bản đồ tùy chỉnh để kiểm soát thứ tự hiển thị (z-index) nghiêm ngặt
  map.createPane("oldHamletsPane");
  map.getPane("oldHamletsPane").style.zIndex = "350"; // Dưới các lớp phủ thông thường (mặc định overlayPane là 400)
  map.getPane("oldHamletsPane").style.pointerEvents = "none"; // Tránh cản trở tương tác click

  map.createPane("newHamletsPane");
  map.getPane("newHamletsPane").style.zIndex = "400"; // Ngang cấp lớp phủ chuẩn

  map.createPane("glowPane");
  map.getPane("glowPane").style.zIndex = "410"; // Nằm trên ranh giới ấp mới một chút
  map.getPane("glowPane").style.pointerEvents = "none";

  map.createPane("connectingLinesPane");
  map.getPane("connectingLinesPane").style.zIndex = "420"; // Nằm trên ranh giới ấp mới và vòng phát sáng
  map.getPane("connectingLinesPane").style.pointerEvents = "none";



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

  // 4. Declare configuration variables dynamically
  let globalConfig = null;
  let hamletNames = [];
  let hamletColors = {};
  let HAMLET_LABEL_CENTERS = {};
  let oldHamletNames = [];
  let manualOldHamlets = [];
  let mergedHamletSources = {};
  let communeProperties = {};
  let areaUnit = null; // "ha" | "km2"; null = giữ hiển thị mặc định cũ
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
  // Map of parentHamletName -> array of old hamlet label markers (hidden by default, shown on selection)
  const oldHamletLabelsByParent = {};
  const oldHamletCenters = {};
  let connectingLinesLayerGroup = L.layerGroup().addTo(map);

  // Audio thuyết minh ấp — theo phương án xa_dai_an: new Audio(audio/{ma}.mp3) khi click chọn ấp
  let currentAudio = null;
  let currentProperties = null;

  function setTtsButtonState(state, btnEl) {
    const btn = btnEl || document.getElementById("tts-global-btn");
    if (!btn || btn.id !== "tts-global-btn") return;
    const icon = btn.querySelector("i");
    btn.classList.remove("speaking");
    if (state === "disabled") {
      btn.classList.add("disabled");
      if (icon) icon.className = "fas fa-volume-xmark";
      btn.title = "Chọn một ấp để nghe thuyết minh";
    } else if (state === "ready") {
      btn.classList.remove("disabled");
      if (icon) icon.className = "fas fa-volume-high";
      btn.title = "Bật/Tắt âm thanh thuyết minh";
    } else if (state === "playing") {
      btn.classList.remove("disabled");
      btn.classList.add("speaking");
      if (icon) icon.className = "fas fa-volume-high";
      btn.title = "Bật/Tắt âm thanh thuyết minh";
    }
  }

  function normalizeAudioFilename(filename) {
    if (!filename) return filename;
    const base = String(filename).trim().split("/").pop();
    return base.toLowerCase().endsWith(".mp3") ? base : `${base}.mp3`;
  }

  function normalizeAudioPath(path) {
    if (!path) return path;
    const name = path.startsWith("audio/") ? path.slice(6) : path;
    return `audio/${normalizeAudioFilename(name)}`;
  }

  function getAudioPathCandidates(audioPath) {
    const normalized = normalizeAudioPath(audioPath);
    const candidates = [normalized];
    if (normalized.endsWith(".mp3")) {
      candidates.push(normalized.slice(0, -4));
    }
    return [...new Set(candidates)];
  }

  function resolveHamletAudioPath(props) {
    if (!props) return null;
    if (props.audio) return normalizeAudioPath(props.audio);
    if (props.ma) return normalizeAudioPath(`audio/${props.ma}`);
    if (props.ten && globalConfig?.hamlets) {
      const h = globalConfig.hamlets.find((x) => x.name === props.ten);
      if (h?.audio) return normalizeAudioPath(h.audio);
      if (h?.ma) return normalizeAudioPath(`audio/${h.ma}`);
    }
    return normalizeAudioPath(`audio/${props.ma || "30050"}`);
  }

  function speakCommuneInfo(props, buttonEl = null) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      setTtsButtonState("ready");
    }

    currentProperties = props;
    const audioPath = resolveHamletAudioPath(props);
    if (!audioPath) return;

    const activeBtn = buttonEl || document.getElementById("tts-global-btn");
    const candidates = getAudioPathCandidates(audioPath);
    let candidateIndex = 0;

    const tryPlayCandidate = () => {
      if (candidateIndex >= candidates.length) {
        console.error("Lỗi tải/phát âm thanh thuyết minh:", audioPath);
        setTtsButtonState("ready", activeBtn);
        currentAudio = null;
        return;
      }

      const path = candidates[candidateIndex++];
      const player = new Audio(path);
      currentAudio = player;

      player.addEventListener("play", () => {
        setTtsButtonState("playing", activeBtn);
      });

      player.addEventListener("ended", () => {
        setTtsButtonState("ready", activeBtn);
        currentAudio = null;
      });

      player.addEventListener("error", () => {
        player.pause();
        tryPlayCandidate();
      });

      player.play().catch(() => {
        player.pause();
        tryPlayCandidate();
      });
    };

    tryPlayCandidate();
  }

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
    const cleanName = String(name).trim().replace(/^(ấp\s+)/i, "");
    return "ẤP " + cleanName.toLocaleUpperCase("vi-VN");
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

  function renderOfficialsSection(props) {
    const section = document.getElementById("officials-section");
    const listEl = document.getElementById("officials-list");
    if (!section || !listEl) return;

    const officials = Array.isArray(props?.can_bo) ? props.can_bo : [];
    const normalizedOfficials = officials.filter((item) => {
      if (!item || typeof item !== "object") return false;
      return item.ho_ten || item.chuc_vu || item.so_dien_thoai;
    });

    listEl.innerHTML = "";
    if (normalizedOfficials.length === 0) {
      section.style.display = "none";
      return;
    }

    normalizedOfficials.forEach((official) => {
      const card = document.createElement("div");
      card.className = "official-card";

      const safeName = official.ho_ten || "Chưa cập nhật";
      const safeRole = official.chuc_vu || "Chưa cập nhật chức vụ";
      const phone = (official.so_dien_thoai || "").trim();
      const phoneHref = phone.replace(/[^\d+]/g, "");
      const phoneHtml = phone
        ? `<a class="official-phone" href="tel:${phoneHref}"><i class="fas fa-phone"></i> ${phone}</a>`
        : `<span class="official-phone muted"><i class="fas fa-phone-slash"></i> Chưa có số điện thoại</span>`;

      card.innerHTML = `
        <div class="official-name">${safeName}</div>
        <div class="official-role">${safeRole}</div>
        ${phoneHtml}
      `;
      listEl.appendChild(card);
    });

    section.style.display = "block";
  }

  function formatPopulationDensity(props) {
    const pop = parseInt(props.dan_so || 0, 10);
    let km2 = 0;
    if (props.dien_tich_ha) {
      km2 = parseFloat(String(props.dien_tich_ha).replace(",", ".")) / 100.0;
    } else {
      km2 = parseFloat(String(props.dien_tich_km2 || 0).replace(",", "."));
    }
    const density =
      km2 > 0
        ? pop / km2
        : parseFloat(String(props.mat_do_km2 || 0).replace(",", "."));
    if (!density || Number.isNaN(density)) return "—";
    return (
      density.toLocaleString("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
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

  // --- Nhãn ấp cũ: ẩn mặc định, chỉ hiện khi chọn ấp mới tương ứng ---

  function hideAllOldHamletLabels() {
    Object.values(oldHamletLabelsByParent).forEach(markers => {
      markers.forEach(marker => {
        const el = marker.getElement();
        if (el) {
          el.classList.add("old-hamlet-label-hidden");
        }
      });
    });
  }

  function showOldHamletLabelsFor(hamletName) {
    // Ẩn hết trước
    hideAllOldHamletLabels();
    // Chỉ hiện nhãn của ấp mới được chọn, với hiệu ứng fade-in
    const markers = oldHamletLabelsByParent[hamletName] || [];
    markers.forEach(marker => {
      const el = marker.getElement();
      if (el) {
        el.classList.remove("old-hamlet-label-hidden");
        // Kích hoạt lại animation mỗi lần hiện
        const span = el.querySelector(".old-hamlet-map-label");
        if (span) {
          span.style.animation = "none";
          // Force reflow để animation chạy lại
          void span.offsetWidth;
          span.style.animation = "";
        }
      }
    });
    // Áp dụng scale theo zoom hiện tại cho nhãn vừa hiện
    updateOffsetHamletLabels();
  }


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
        const communeDisplayName = (communeProperties && communeProperties.ten)
          ? ("XÃ " + String(communeProperties.ten).toLocaleUpperCase("vi-VN"))
          : "BẢN ĐỒ XÃ";
        hudText.innerText = communeDisplayName;
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
      pane: "glowPane",
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
    connectingLinesLayerGroup.clearLayers();
    const prev = selectedHamletName;
    
    // Đồng bộ nhãn chữ về trạng thái thường
    selectLabel(null, false);

    // Ẩn toàn bộ nhãn ấp cũ khi bỏ chọn
    hideAllOldHamletLabels();

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

    // Hiện nhãn ấp cũ thuộc ấp mới vừa được chọn
    showOldHamletLabelsFor(hamletName);

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

      // Vẽ đường nét đứt phát sáng động kết nối từ nhãn cũ tới nhãn mới
      connectingLinesLayerGroup.clearLayers();

      if (globalConfig) {
        const currentHamlet = globalConfig.hamlets.find(h => h.name === hamletName);
        if (currentHamlet && currentHamlet.subHamlets) {
          const newHamletCenter = HAMLET_LABEL_CENTERS[hamletName] || pathLayer.getBounds().getCenter();
          currentHamlet.subHamlets.forEach((sub) => {
            if (sub.visible !== false && sub.showLine !== false) {
              // Use composite key first to avoid collision when two new hamlets share a sub-hamlet name
              const compositeKey = hamletName + "||" + sub.name;
              const oldCoords = oldHamletCenters[compositeKey] || oldHamletCenters[sub.name];
              if (oldCoords) {
                const polyline = L.polyline([oldCoords, newHamletCenter], {
                  color: "#ffffff",
                  weight: 3.5,
                  opacity: 0.98,
                  dashArray: "8, 6",
                  className: "connecting-glowing-line",
                  pane: "connectingLinesPane"
                }).addTo(connectingLinesLayerGroup);
              }
            }
          });
        }
      }
    }
  }

  // 5. Setup Boundaries and Loading from Config
  fetch("map data/compiled-config.json")
    .then((res) => res.json())
    .then((config) => {
      // Store to globalConfig
      globalConfig = config;

      // Update intro audio if a custom one is configured
      if (config.intro_audio) {
        introAudio.src = config.intro_audio;
        introAudio.load();
      }

      // Initialize dynamic configuration
      hamletNames = config.hamlets.map(h => h.name);
      config.hamlets.forEach((h, idx) => {
        hamletColors[h.name] = h.color || "#ff4d4d";
        HAMLET_LABEL_CENTERS[h.name] = h.center;
        
        // Pre-fill oldHamletCenters coordinates from config using composite key to avoid
        // name collision when two different new hamlets share a sub-hamlet name.
        if (h.subHamlets) {
          h.subHamlets.forEach(sub => {
            // Composite key: parentHamletName + separator + subName
            const compositeKey = h.name + "||" + sub.name;
            oldHamletCenters[compositeKey] = L.latLng(sub.center[0], sub.center[1]);
            // Also set plain key only if not already set (first-writer wins for backward compat)
            if (!oldHamletCenters[sub.name]) {
              oldHamletCenters[sub.name] = L.latLng(sub.center[0], sub.center[1]);
            }
          });
        }
      });
      oldHamletNames = config.oldHamlets ? config.oldHamlets.map(oh => oh.name) : [];
      manualOldHamlets = config.manualOldHamlets || [];
      mergedHamletSources = config.mergedHamletSources || {};
      areaUnit = config.area_unit || null;
      communeProperties = config.communeProperties || {
        ten: config.commune_name || "",
        loai: "Xã",
        cap: "2",
        dien_tich_km2: "0",
        dan_so: "0",
        so_ho: "0",
        mat_do_km2: "0"
      };

      // Set map default center & zoom
      const center = config.defaultCenter || [9.914, 106.08];
      const zoom = config.defaultZoom || 13;
      map.setView(center, zoom);

      // Load Hamlet layers
      const geojsonPromises = config.hamlets.map((h) =>
        fetch(`map data/${h.file}`)
          .then((res) => res.json())
          .then((data) => ({ name: h.name, data }))
      );

      Promise.all(geojsonPromises)
        .then((results) => {
          const geojsonLayers = [];
          results.forEach(({ name: hamletName, data }) => {
            const layer = L.geoJSON(data, {
              pane: "newHamletsPane",
              style: getHamletStyle,
              onEachFeature: (feature, featureLayer) => {
                // Đồng bộ mã ấp & đường dẫn audio từ config vào GeoJSON properties
                const hConfig = config.hamlets.find(h => h.name === hamletName);
                if (hConfig) {
                  if (hConfig.ma) feature.properties.ma = String(hConfig.ma);
                  if (hConfig.audio) {
                    feature.properties.audio = normalizeAudioPath(hConfig.audio);
                  } else if (hConfig.ma) {
                    feature.properties.audio = normalizeAudioPath(`audio/${hConfig.ma}`);
                  }
                  feature.properties.can_bo = Array.isArray(hConfig.properties?.can_bo)
                    ? hConfig.properties.can_bo
                    : [];
                }

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
      oldHamletNames.forEach((name) => {
        fetch(`map data/ranh gioi ap cu/${encodeURIComponent(name)}.geojson`)
          .then((res) => res.json())
          .then((data) => {
            const geojsonLayer = L.geoJSON(data, {
              pane: "oldHamletsPane",
              style: {
                color: "#ffffff",
                weight: 2.2,
                opacity: 0.95,
                fill: false,
                interactive: false
              }
            }).addTo(oldHamletsLayerGroup);

            // Check if visible from config
            let isVisible = true;
            for (const h of config.hamlets) {
              if (h.subHamlets) {
                const sub = h.subHamlets.find(sh => sh.name === name);
                if (sub && sub.visible === false) {
                  isVisible = false;
                  break;
                }
              }
            }

            // Tạo nhãn tên cho ranh giới ấp cũ
            const bounds = geojsonLayer.getBounds();
            if (bounds.isValid()) {
              const latlng = bounds.getCenter();
              
              // Dịch chuyển nhẹ tọa độ nhãn để tránh đè trực tiếp lên nhãn mới
              const ohConf = config.oldHamlets.find(oh => oh.name === name);
              const offsetLatlng = ohConf && ohConf.center ? L.latLng(ohConf.center[0], ohConf.center[1]) : latlng;

              oldHamletCenters[name] = offsetLatlng;

              // Also update composite key entries for all parent hamlets that own this old hamlet
              config.hamlets.forEach(h => {
                if (h.subHamlets && h.subHamlets.some(sh => sh.name === name)) {
                  const compositeKey = h.name + "||" + name;
                  oldHamletCenters[compositeKey] = offsetLatlng;
                }
              });
            }
          })
          .catch((err) => console.error(`Lỗi khi tải ranh giới ấp cũ ${name}:`, err));
      });

      // Thêm nhãn tên các ấp cũ của ấp 1 mới và ấp 2 mới từ config (được phân bổ tự động / chỉnh thủ công)
      manualOldHamlets.forEach((item) => {
        let isVisible = true;
        for (const h of config.hamlets) {
          if (h.subHamlets) {
            const sub = h.subHamlets.find(sh => sh.name === item.name);
            if (sub && sub.visible === false) {
              isVisible = false;
              break;
            }
          }
        }

        const latlng = L.latLng(item.coords[0], item.coords[1]);
        oldHamletCenters[item.name] = latlng;

        // Also update composite key entries for all parent hamlets that own this old hamlet
        config.hamlets.forEach(h => {
          if (h.subHamlets && h.subHamlets.some(sh => sh.name === item.name)) {
            const compositeKey = h.name + "||" + item.name;
            oldHamletCenters[compositeKey] = latlng;
          }
        });

        if (isVisible) {
          let displayName = item.name;
          if (displayName.includes("(cũ)")) {
            displayName = displayName.replace(/\s*\(cũ\)/g, "");
          }
          const labelText = `${formatHamletName(displayName)} (ẤP CŨ)`;
          const marker = L.marker(latlng, {
            icon: L.divIcon({
              className: "hamlet-map-label-icon old-hamlet-label-hidden",
              html: `<span class="hamlet-map-label old-hamlet-map-label">${labelText}</span>`,
            }),
            interactive: false,
            keyboard: false,
            zIndexOffset: 500
          }).addTo(hamletLabelsLayerGroup);

          // Lưu marker theo cha mẹ
          config.hamlets.forEach(h => {
            if (h.subHamlets && h.subHamlets.some(sh => sh.name === item.name)) {
              if (!oldHamletLabelsByParent[h.name]) oldHamletLabelsByParent[h.name] = [];
              oldHamletLabelsByParent[h.name].push(marker);
            }
          });
        }
      });

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
    })
    .catch((err) => console.error("Lỗi khi tải cấu hình bản đồ:", err));

  // Tự động thu phóng/ẩn nhãn theo mức độ zoom để bản đồ luôn thoáng đạt
  function updateOffsetHamletLabels() {
    const zoom = map.getZoom();
    const isMobile = window.innerWidth <= 768;
    Object.keys(hamletLabelMarkersByName).forEach((hamletName) => {
      const marker = hamletLabelMarkersByName[hamletName];
      if (!marker) return;
      const element = marker.getElement();
      if (!element) return;
      const span = element.querySelector(".hamlet-map-label");
      if (!span) return;

      if (zoom < 12) {
        // Thu nhỏ hoàn toàn và ẩn đi khi zoom quá xa
        span.style.opacity = "0";
        span.style.transform = "translate(-50%, -50%) scale(0.5)";
        span.style.pointerEvents = "none";
      } else if (zoom === 12) {
        // Bắt đầu hiển thị rất nhỏ
        span.style.opacity = "0.7";
        span.style.fontSize = "9.36px";
        span.style.padding = "1.5px 3px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(0.8)";
        }
      } else if (zoom === 13) {
        // Zoom mặc định chuẩn
        span.style.opacity = "1";
        span.style.fontSize = isMobile ? "11.23px" : "14.98px";
        span.style.padding = isMobile ? "2px 4px" : "2.5px 6px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(1)";
        }
      } else if (zoom === 14) {
        // Phóng to nhẹ khi bắt đầu cận cảnh
        span.style.opacity = "1";
        span.style.fontSize = isMobile ? "12.17px" : "14.98px";
        span.style.padding = isMobile ? "2px 5px" : "3px 7px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(1.05)";
        }
      } else {
        // Zoom cận cảnh tối đa
        span.style.opacity = "1";
        span.style.fontSize = isMobile ? "13.1px" : "16.85px";
        span.style.padding = isMobile ? "2.5px 6px" : "4px 8px";
        span.style.pointerEvents = "auto";
        if (!span.classList.contains("hover") && !span.classList.contains("selected")) {
          span.style.transform = "translate(-50%, -50%) scale(1.1)";
        }
      }
    });

    // Tự động thu phóng nhãn ấp cũ theo mức độ zoom — chỉ áp dụng cho nhãn đang hiển thị
    const allOldMarkers = Object.values(oldHamletLabelsByParent).flat();
    allOldMarkers.forEach((marker) => {
      if (!marker) return;
      const element = marker.getElement();
      if (!element) return;
      // Bỏ qua nhãn đang bị ẩn
      if (element.classList.contains("old-hamlet-label-hidden")) return;
      const span = element.querySelector(".old-hamlet-map-label");
      if (!span) return;

      if (zoom < 12) {
        span.style.opacity = "0";
        span.style.transform = "translate(-50%, -50%) scale(0.4)";
      } else if (zoom === 12) {
        span.style.opacity = "0.7";
        span.style.fontSize = "8.99px";
        span.style.padding = "1.2px 2.4px";
        span.style.transform = "translate(-50%, -50%) scale(0.64)";
      } else if (zoom === 13) {
        span.style.opacity = "0.85";
        span.style.fontSize = isMobile ? "11.23px" : "14.6px";
        span.style.padding = isMobile ? "1.8px 3.6px" : "2.4px 5.4px";
        span.style.transform = "translate(-50%, -50%) scale(0.8)";
      } else if (zoom === 14) {
        span.style.opacity = "0.85";
        span.style.fontSize = isMobile ? "11.23px" : "14.6px";
        span.style.padding = isMobile ? "1.8px 4.8px" : "3px 6.6px";
        span.style.transform = "translate(-50%, -50%) scale(0.84)";
      } else {
        span.style.opacity = "0.85";
        span.style.fontSize = isMobile ? "12.36px" : "15.72px";
        span.style.padding = isMobile ? "2.4px 5.4px" : "3.6px 7.2px";
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

  function resetSidebarPosition() {
    sidebar.style.top = "";
    sidebar.style.left = "";
    sidebar.style.right = "";
    sidebar.style.bottom = "";
    sidebar.style.transform = "";
    sidebar.style.transition = "";
  }

  function openCommuneSidebar() {
    resetSidebarPosition();
    selectedHamletProperties = null;
    clearHamletSelection();

    const isMobile = window.innerWidth <= 768;
    sidebar.classList.add("active");
    sidebar.classList.add("is-commune");
    sidebar.classList.remove("is-hamlet");
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
    const officialsSection = document.getElementById("officials-section");
    if (officialsSection) officialsSection.style.display = "none";

    // Header updates
    const communeNameDisplay = communeProperties && communeProperties.ten
      ? ("XÃ " + String(communeProperties.ten).toLocaleUpperCase("vi-VN"))
      : "BẢNG THÔNG TIN XÃ";
    document.getElementById("commune-name").innerText = communeNameDisplay;
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

    const communeAreaKm2 = parseFloat(String(communeProperties.dien_tich_km2 || 0).replace(",", ".")) || 0;
    const communeAreaHa = communeProperties.dien_tich_ha
      ? (parseFloat(String(communeProperties.dien_tich_ha).replace(",", ".")) || 0)
      : communeAreaKm2 * 100.0;
    if (areaUnit === "ha") {
      animateValue("stat-area", 0, communeAreaHa, 1000, 2, " ha");
    } else {
      animateValue("stat-area", 0, communeAreaKm2, 1000, 2, " km²");
    }
    animateValue("stat-pop", 0, parseInt(communeProperties.dan_so), 1200, 0, " người");
    animateValue("stat-density", 0, parseInt(communeProperties.so_ho), 1500, 0, " hộ");

    setTtsButtonState("disabled");

    // Clear audio name label
    const audioNameEl = document.getElementById("tts-audio-name");
    if (audioNameEl) {
      audioNameEl.textContent = "";
      audioNameEl.style.display = "none";
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
      // Sắp xếp A-Z theo bảng chữ cái tiếng Việt trước khi hiển thị
      const sortedHamletNames = [...hamletNames].sort((a, b) =>
        a.localeCompare(b, "vi-VN", { sensitivity: "base" })
      );
      sortedHamletNames.forEach((hName) => {
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
    resetSidebarPosition();
    selectedHamletProperties = props;
    currentProperties = props;

    const isMobile = window.innerWidth <= 768;
    sidebar.classList.add("active");
    sidebar.classList.add("is-hamlet");
    sidebar.classList.remove("is-commune");
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

    if (areaUnit === "km2") {
      animateValue("stat-area", 0, areaHa / 100.0, 1000, 2, " km²");
    } else {
      animateValue("stat-area", 0, areaHa, 1000, 2, " ha");
    }
    animateValue("stat-pop", 0, popVal, 1200, 0, " người");
    animateValue("stat-density", 0, hoVal, 1500, 0, " hộ");

    setTtsButtonState("ready");

    // Show audio file name label next to the TTS button
    const audioNameEl = document.getElementById("tts-audio-name");
    if (audioNameEl) {
      const rawAudio = props.audio || `audio/${props.ma || ""}.mp3`;
      // Extract just the filename portion
      const audioFilename = rawAudio.split("/").pop();
      audioNameEl.textContent = audioFilename;
      audioNameEl.style.display = "inline";
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
    renderOfficialsSection(props);

    speakCommuneInfo(props);
    updateSidebarToggleButton();
  }

  function closeSidebar() {
    resetSidebarPosition();
    const wasActive = sidebar.classList.contains("active");

    // Dừng phát âm thanh giới thiệu khi đóng bảng thông tin
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    setTtsButtonState("disabled");

    // Clear audio name label
    const audioNameElClose = document.getElementById("tts-audio-name");
    if (audioNameElClose) {
      audioNameElClose.textContent = "";
      audioNameElClose.style.display = "none";
    }
    const officialsSection = document.getElementById("officials-section");
    if (officialsSection) officialsSection.style.display = "none";

    map.closePopup();
    clearHamletSelection();
    sidebar.classList.remove("active");
    sidebar.classList.remove("minimized");
    sidebar.classList.remove("is-commune", "is-hamlet");
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
      
      // Dừng phát âm thanh thuyết minh hiện tại
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      
      openCommuneSidebar();
      zoomToAllHamlets();
    });
  }



  // --- DESKTOP DRAGGABLE SIDEBAR LOGIC ---
  (function initDesktopDraggableSidebar() {
    let isDesktopDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const sidebarHeaderEl = document.querySelector("#sidebar .sidebar-header");
    if (!sidebarHeaderEl) return;

    sidebarHeaderEl.style.cursor = "move"; // Change cursor to indicate draggability

    sidebarHeaderEl.addEventListener("mousedown", (e) => {
      // Only drag on desktop screen sizes
      if (window.innerWidth <= 768) return;

      // Don't drag if we click interactive controls like buttons
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".sound-toggle-btn")) {
        return;
      }

      isDesktopDragging = true;
      sidebar.classList.add("desktop-dragging");

      const rect = sidebar.getBoundingClientRect();

      // Force absolute top/left and reset bottom/right
      sidebar.style.right = "auto";
      sidebar.style.bottom = "auto";
      sidebar.style.left = rect.left + "px";
      sidebar.style.top = rect.top + "px";
      
      // Clear transitions and transform while dragging
      sidebar.style.transform = "none";
      sidebar.style.transition = "none";

      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDesktopDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Constrain dragging within the viewport boundaries
      const rect = sidebar.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      sidebar.style.left = newLeft + "px";
      sidebar.style.top = newTop + "px";
    });

    document.addEventListener("mouseup", () => {
      if (isDesktopDragging) {
        isDesktopDragging = false;
        sidebar.classList.remove("desktop-dragging");
        sidebar.style.transition = ""; // Restore original CSS transition properties
      }
    });
  })();

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

  // 8. Text-to-Speech (TTS) — nút loa điều khiển thủ công (theo xa_dai_an)
  const globalTtsBtn = document.getElementById("tts-global-btn");
  if (globalTtsBtn) {
    globalTtsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (globalTtsBtn.classList.contains("disabled")) return;

      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        setTtsButtonState("ready", globalTtsBtn);
      } else if (currentProperties) {
        speakCommuneInfo(currentProperties, globalTtsBtn);
      }
    });
  }

});
