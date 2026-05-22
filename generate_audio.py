import asyncio
import json
import os
import sys

import edge_tts

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROVINCE = "Vĩnh Long"
COMMUNE = "Cầu Kè"
VOICE = "vi-VN-HoaiMyNeural"
TTS_RATE = "+15%"


def clean_value(val):
    if val is None:
        return ""
    return str(val).strip()


def parse_float(val, default=0.0):
    try:
        return float(str(val).replace(",", "."))
    except (TypeError, ValueError):
        return default


def parse_int(val, default=0):
    try:
        return int(float(str(val).replace(",", ".")))
    except (TypeError, ValueError):
        return default


def speak_number(value, decimals=0):
    """Chuyển số sang dạng đọc TTS (dấu phẩy thập phân)."""
    num = parse_float(value, 0)
    if decimals > 0:
        formatted = f"{num:.{decimals}f}".replace(".", ",")
    else:
        formatted = str(int(round(num)))
    return formatted


def normalize_name(name):
    return clean_value(name).lower()


def is_hamlet_merged(props):
    source_list = props.get("sap_nhap_tu")
    ten = clean_value(props.get("ten"))
    if not isinstance(source_list, list) or len(source_list) == 0:
        return False
    if len(source_list) > 1:
        return True
    return normalize_name(source_list[0]) != normalize_name(ten)


def get_display_name(props):
    name = clean_value(props.get("ten")) or "Chưa rõ tên"
    loai = clean_value(props.get("loai")) or "Ấp"
    if name.lower().startswith(loai.lower()):
        return loai, name[len(loai) :].strip() or name
    return loai, name


def build_merger_text(props):
    if not is_hamlet_merged(props):
        return "Về sáp nhập hành chính, đơn vị này được giữ nguyên ranh giới."
    sources = props.get("sap_nhap_tu") or []
    names = ", ".join(clean_value(s) for s in sources if clean_value(s))
    return f"Được sáp nhập từ các ấp: {names}."


def build_narration(props):
    loai, display_name = get_display_name(props)
    full_name = f"{loai} {display_name}" if display_name else loai

    area_ha = parse_float(props.get("dien_tich_ha"), 0)
    area_km2 = parse_float(props.get("dien_tich_km2"), 0)
    if area_km2 <= 0 and area_ha > 0:
        area_km2 = area_ha / 100

    pop = parse_int(props.get("dan_so"), 0)
    households = parse_int(props.get("so_ho"), 0)
    density = parse_float(props.get("mat_do_km2"), 0)
    if density <= 0 and area_km2 > 0 and pop > 0:
        density = pop / area_km2

    parts = [
        f"Chào mừng bạn đến với {full_name}.",
        f"Đây là đơn vị hành chính cấp ba, thuộc xã {COMMUNE}, tỉnh {PROVINCE}.",
        f"Phân loại đơn vị: {loai}. Cấp quản lý: cấp ba.",
    ]

    if area_ha > 0:
        parts.append(
            f"Diện tích tự nhiên là {speak_number(area_ha, 2)} héc-ta, "
            f"tương đương {speak_number(area_km2, 4)} kilômét vuông."
        )

    if pop > 0:
        parts.append(f"Dân số {speak_number(pop)} người.")

    if households > 0:
        parts.append(f"Số hộ dân cư {speak_number(households)} hộ.")

    if density > 0:
        parts.append(
            f"Mật độ dân số {speak_number(density, 2)} người trên một kilômét vuông."
        )

    parts.append(build_merger_text(props))
    return " ".join(parts)


async def generate_tts_with_retry(text: str, output_path: str, retries=5, delay=3):
    for attempt in range(1, retries + 1):
        try:
            print(f"Generating ({attempt}/{retries}): {os.path.basename(output_path)}")
            await edge_tts.Communicate(text, VOICE, rate=TTS_RATE).save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                print(f"  OK: {os.path.getsize(output_path)} bytes")
                return True
            raise ValueError("Generated file is empty or too small.")
        except Exception as exc:
            print(f"  Error: {exc}")
            if attempt < retries:
                await asyncio.sleep(delay)
                delay *= 2
            else:
                raise
    return False


async def process_files():
    geojson_dir = "map data"
    audio_dir = "audio"
    os.makedirs(audio_dir, exist_ok=True)

    geojson_files = sorted(f for f in os.listdir(geojson_dir) if f.endswith(".geojson"))
    print(f"Found {len(geojson_files)} GeoJSON file(s).")

    generated = 0
    for file_name in geojson_files:
        geojson_path = os.path.join(geojson_dir, file_name)
        try:
            with open(geojson_path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except OSError as exc:
            print(f"Skip {file_name}: {exc}")
            continue

        for index, feature in enumerate(data.get("features", [])):
            props = feature.get("properties", {})
            ma = clean_value(props.get("ma") or props.get("id") or f"audio_{index}")
            name = clean_value(props.get("ten"))

            if name == "Cầu Kè" or ma == "30050":
                print(f"Skip commune: {name}")
                continue

            text = build_narration(props)
            output_file = os.path.join(audio_dir, f"{ma}.mp3")

            print(f"\n[{ma}] {name}")
            print(f"  {text[:120]}...")
            await generate_tts_with_retry(text, output_file)
            generated += 1
            await asyncio.sleep(1.5)

    print(f"\nDone. Generated {generated} audio file(s) in '{audio_dir}/'.")


def main():
    asyncio.run(process_files())


if __name__ == "__main__":
    main()
