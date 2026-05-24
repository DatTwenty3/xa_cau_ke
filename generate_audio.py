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


HAMLET_DETAILS = {
    "Ấp 1": {
        "is_merged": True,
        "new_area": 137.95,
        "new_households": 993,
        "new_pop": 4045,
        "sources": [
            {"ten": "Ấp 1 cũ", "area": 52.09, "households": 430, "pop": 1751},
            {"ten": "Ấp 2", "area": 29.05, "households": 304, "pop": 1234},
            {"ten": "Ấp 3", "area": 56.80, "households": 259, "pop": 1060}
        ]
    },
    "Ấp 2": {
        "is_merged": True,
        "new_area": 168.08,
        "new_households": 838,
        "new_pop": 3372,
        "sources": [
            {"ten": "Ấp 4", "area": 15.84, "households": 274, "pop": 1076},
            {"ten": "Ấp 5", "area": 57.81, "households": 246, "pop": 1045},
            {"ten": "Ấp 6", "area": 94.43, "households": 318, "pop": 1251}
        ]
    },
    "Ấp Ô Tưng": {
        "is_merged": True,
        "new_area": 760.73,
        "new_households": 834,
        "new_pop": 3567,
        "sources": [
            {"ten": "Ấp Ô Tưng A", "area": 362.03, "households": 341, "pop": 1412},
            {"ten": "Ấp Ô Tưng B", "area": 398.70, "households": 493, "pop": 2155}
        ]
    },
    "Ấp Xóm Lớn": {
        "is_merged": True,
        "new_area": 677.54,
        "new_households": 887,
        "new_pop": 3989,
        "sources": [
            {"ten": "Ấp Trà Bôn", "area": 387.93, "households": 488, "pop": 2154},
            {"ten": "Ấp Xóm Lớn cũ", "area": 289.61, "households": 399, "pop": 1835}
        ]
    },
    "Ấp Trà Kháo": {"is_merged": False, "area": 376.49, "households": 686, "pop": 2780},
    "Ấp Bà My": {"is_merged": False, "area": 543.04, "households": 705, "pop": 2910},
    "Ấp Giồng Lớn": {"is_merged": False, "area": 393.81, "households": 601, "pop": 2494},
    "Ấp Thông Thảo": {"is_merged": False, "area": 385.91, "households": 571, "pop": 2421},
    "Ấp Giồng Dầu": {"is_merged": False, "area": 321.91, "households": 413, "pop": 1704},
    "Ấp Rùm Sóc": {"is_merged": False, "area": 291.61, "households": 441, "pop": 1876},
    "Ấp Ô Mịch": {"is_merged": False, "area": 470.98, "households": 471, "pop": 2044},
    "Ấp Châu Hưng": {"is_merged": False, "area": 548.74, "households": 530, "pop": 2283},
    "Ấp Ô Rồm": {"is_merged": False, "area": 334.77, "households": 429, "pop": 1848}
}


def find_hamlet_details(name):
    norm_name = clean_value(name).lower().replace("ấp", "").strip()
    for k, v in HAMLET_DETAILS.items():
        norm_k = k.lower().replace("ấp", "").strip()
        if norm_name == norm_k:
            return k, v
    return None, None


HAMLET_AUDIO_TEXTS = {
    "Ấp 1": {
        "text": "Ấp 1 (mới): Dự kiến được sáp nhập từ Ấp 1 (cũ), Ấp 2 và Ấp 3. Trong đó: Ấp 1 (cũ) có diện tích 52,09 ha, số hộ 430 hộ, dân số 1.751 dân; Ấp 2 có diện tích 29,05 ha, số hộ 304 hộ, dân số 1.234 dân; Ấp 3 có diện tích 56,80 ha, số hộ 259 hộ, dân số 1.060 dân. Sau khi sáp nhập, Ấp 1 (mới) có tổng diện tích là 137,95 ha, tổng số hộ là 993 hộ và tổng dân số là 4.045 dân.",
        "tts": "Ấp 1 mới: Dự kiến được sáp nhập từ Ấp 1 cũ, Ấp 2 và Ấp 3. Trong đó: Ấp 1 cũ có diện tích 52,09 héc-ta, số hộ 430 hộ, dân số 1751 dân; Ấp 2 có diện tích 29,05 héc-ta, số hộ 304 hộ, dân số 1234 dân; Ấp 3 có diện tích 56,80 héc-ta, số hộ 259 hộ, dân số 1060 dân. Sau khi sáp nhập, Ấp 1 mới có tổng diện tích là 137,95 héc-ta, tổng số hộ là 993 hộ và tổng dân số là 4045 dân."
    },
    "Ấp 2": {
        "text": "Ấp 2 (mới): Dự kiến được sáp nhập từ Ấp 4, Ấp 5 và Ấp 6. Trong đó: Ấp 4 có diện tích 15,84 ha, số hộ 274 hộ, dân số 1.076 dân; Ấp 5 có diện tích 57,81 ha, số hộ 246 hộ, dân số 1.045 dân; Ấp 6 có diện tích 94,43 ha, số hộ 318 hộ, dân số 1.251 dân. Sau khi sáp nhập, Ấp 2 (mới) có tổng diện tích là 168,08 ha, tổng số hộ là 838 hộ và tổng dân số là 3.372 dân.",
        "tts": "Ấp 2 mới: Dự kiến được sáp nhập từ Ấp 4, Ấp 5 và Ấp 6. Trong đó: Ấp 4 có diện tích 15,84 héc-ta, số hộ 274 hộ, dân số 1076 dân; Ấp 5 có diện tích 57,81 héc-ta, số hộ 246 hộ, dân số 1045 dân; Ấp 6 có diện tích 94,43 héc-ta, số hộ 318 hộ, dân số 1251 dân. Sau khi sáp nhập, Ấp 2 mới có tổng diện tích là 168,08 héc-ta, tổng số hộ là 838 hộ và tổng dân số là 3372 dân."
    },
    "Ấp Trà Kháo": {
        "text": "Ấp Trà Kháo: Dự kiến giữ nguyên diện tích là 376,49 ha, số hộ là 686 hộ và dân số là 2.780 dân.",
        "tts": "Ấp Trà Kháo: Dự kiến giữ nguyên diện tích là 376,49 héc-ta, số hộ là 686 hộ và dân số là 2780 dân."
    },
    "Ấp Bà My": {
        "text": "Ấp Bà My: Dự kiến giữ nguyên diện tích là 543,04 ha, số hộ là 705 hộ và dân số là 2.910 dân.",
        "tts": "Ấp Bà My: Dự kiến giữ nguyên diện tích là 543,04 héc-ta, số hộ là 705 hộ và dân số là 2910 dân."
    },
    "Ấp Giồng Lớn": {
        "text": "Ấp Giồng Lớn: Dự kiến giữ nguyên diện tích là 393,81 ha, số hộ là 601 hộ và dân số là 2.494 dân.",
        "tts": "Ấp Giồng Lớn: Dự kiến giữ nguyên diện tích là 393,81 héc-ta, số hộ là 601 hộ và dân số là 2494 dân."
    },
    "Ấp Thông Thảo": {
        "text": "Ấp Thông Thảo: Dự kiến giữ nguyên diện tích là 385,91 ha, số hộ là 571 hộ và dân số là 2.421 dân.",
        "tts": "Ấp Thông Thảo: Dự kiến giữ nguyên diện tích là 385,91 héc-ta, số hộ là 571 hộ và dân số là 2421 dân."
    },
    "Ấp Giồng Dầu": {
        "text": "Ấp Giồng Dầu: Dự kiến giữ nguyên diện tích là 321,91 ha, số hộ là 413 hộ và dân số là 1.704 dân.",
        "tts": "Ấp Giồng Dầu: Dự kiến giữ nguyên diện tích là 321,91 héc-ta, số hộ là 413 hộ và dân số là 1704 dân."
    },
    "Ấp Rùm Sóc": {
        "text": "Ấp Rùm Sóc: Dự kiến giữ nguyên diện tích là 291,61 ha, số hộ là 441 hộ và dân số là 1.876 dân.",
        "tts": "Ấp Rùm Sóc: Dự kiến giữ nguyên diện tích là 291,61 héc-ta, số hộ là 441 hộ và dân số là 1876 dân."
    },
    "Ấp Ô Mịch": {
        "text": "Ấp Ô Mịch: Dự kiến giữ nguyên diện tích là 470,98 ha, số hộ là 471 hộ và dân số là 2.044 dân.",
        "tts": "Ấp Ô Mịch: Dự kiến giữ nguyên diện tích là 470,98 héc-ta, số hộ là 471 hộ và dân số là 2044 dân."
    },
    "Ấp Ô Tưng": {
        "text": "Ấp Ô Tưng (mới): Dự kiến được sáp nhập từ Ấp Ô Tưng A và Ấp Ô Tưng B. Trong đó: Ấp Ô Tưng A có diện tích 362,03 ha, số hộ 341 hộ, dân số 1.412 dân; Ấp Ô Tưng B có diện tích 398,70 ha, số hộ 493 hộ, dân số 2.155 dân. Sau khi sáp nhập, Ấp Ô Tưng (mới) có tổng diện tích là 760,73 ha, tổng số hộ là 834 hộ và tổng dân số là 3.567 dân.",
        "tts": "Ấp Ô Tưng mới: Dự kiến được sáp nhập từ Ấp Ô Tưng A và Ấp Ô Tưng B. Trong đó: Ấp Ô Tưng A có diện tích 362,03 héc-ta, số hộ 341 hộ, dân số 1412 dân; Ấp Ô Tưng B có diện tích 398,70 héc-ta, số hộ 493 hộ, dân số 2155 dân. Sau khi sáp nhập, Ấp Ô Tưng mới có tổng diện tích là 760,73 héc-ta, tổng số hộ là 834 hộ và tổng dân số là 3567 dân."
    },
    "Ấp Châu Hưng": {
        "text": "Ấp Châu Hưng: Dự kiến giữ nguyên diện tích là 548,74 ha, số hộ là 530 hộ và dân số là 2.283 dân.",
        "tts": "Ấp Châu Hưng: Dự kiến giữ nguyên diện tích là 548,74 héc-ta, số hộ là 530 hộ và dân số là 2283 dân."
    },
    "Ấp Ô Rồm": {
        "text": "Ấp Ô Rồm: Dự kiến giữ nguyên diện tích là 334,77 ha, số hộ là 429 hộ và dân số là 1.848 dân.",
        "tts": "Ấp Ô Rồm: Dự kiến giữ nguyên diện tích là 334,77 héc-ta, số hộ là 429 hộ và dân số là 1848 dân."
    },
    "Ấp Xóm Lớn": {
        "text": "Ấp Xóm Lớn (mới): Dự kiến được sáp nhập từ Ấp Trà Bôn và Ấp Xóm Lớn (cũ). Trong đó: Ấp Trà Bôn có diện tích 387,93 ha, số hộ 488 hộ, dân số 2.154 dân; Ấp Xóm Lớn (cũ) có diện tích 289,61 ha, số hộ 399 hộ, dân số 1.835 dân. Sau khi sáp nhập, Ấp Xóm Lớn (mới) có tổng diện tích là 677,54 ha, tổng số hộ là 887 hộ và tổng dân số là 3.989 dân.",
        "tts": "Ấp Xóm Lớn mới: Dự kiến được sáp nhập từ Ấp Trà Bôn và Ấp Xóm Lớn cũ. Trong đó: Ấp Trà Bôn có diện tích 387,93 héc-ta, số hộ 488 hộ, dân số 2154 dân; Ấp Xóm Lớn cũ có diện tích 289,61 héc-ta, số hộ 399 hộ, dân số 1835 dân. Sau khi sáp nhập, Ấp Xóm Lớn mới có tổng diện tích là 677,54 héc-ta, tổng số hộ là 887 hộ và tổng dân số là 3989 dân."
    }
}


def build_narration(props):
    loai, display_name = get_display_name(props)
    full_name = f"{loai} {display_name}" if display_name else loai

    # Find matching hamlet in HAMLET_AUDIO_TEXTS new
    norm_name = clean_value(full_name).lower().replace("ấp", "").strip()
    matched_key = None
    for k in HAMLET_AUDIO_TEXTS.keys():
        norm_k = k.lower().replace("ấp", "").strip()
        if norm_name == norm_k:
            matched_key = k
            break

    if matched_key:
        # Return optimized TTS text
        return HAMLET_AUDIO_TEXTS[matched_key]["tts"]

    # Fallback if not found
    return build_merger_text(props)


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
