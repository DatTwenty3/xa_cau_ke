import os
import json
import asyncio
import edge_tts

async def generate_tts(text: str, output_path: str):
    # Using Microsoft Azure Neural voice vi-VN-HoaiMyNeural for premium youthful female voice
    voice = "vi-VN-HoaiMyNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"Generated audio file: {output_path}")

def clean_value(val):
    if val is None:
        return "0"
    return str(val).strip()

def main():
    geojson_dir = "map data"
    audio_dir = "audio"
    
    if not os.path.exists(audio_dir):
        os.makedirs(audio_dir)
        print(f"Created directory: {audio_dir}")
        
    if not os.path.exists(geojson_dir):
        print(f"Error: Directory '{geojson_dir}' does not exist.")
        return
        
    geojson_files = [f for f in os.listdir(geojson_dir) if f.endswith(".geojson") or f.endswith(".json")]
    
    if not geojson_files:
        print(f"No GeoJSON files found in '{geojson_dir}' directory.")
        return

    print(f"Found {len(geojson_files)} GeoJSON file(s) to process.")

    for file_name in geojson_files:
        geojson_path = os.path.join(geojson_dir, file_name)
        print(f"Processing a file...")
        
        try:
            with open(geojson_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading {file_name}: {e}")
            continue
            
        features = data.get("features", [])
        print(f"Found {len(features)} feature(s) in the file.")
        
        for index, feature in enumerate(features):
            props = feature.get("properties", {})
            
            # Safe parsing of properties
            ma = clean_value(props.get("ma") or props.get("id") or f"audio_{index}")
            name = props.get("ten") or props.get("name") or "Chưa rõ tên"
            loai = props.get("loai") or "Ấp" # Default to Hamlet if not specified
            
            area = clean_value(props.get("dien_tich_km2") or props.get("dien_tich") or props.get("area") or "0")
            area_spoken = area.replace(".", ",")
            
            pop = clean_value(props.get("dan_so") or props.get("dan_so_nguoi") or props.get("population") or "0")
            pop_spoken = pop.replace(".", "")
            
            density = clean_value(props.get("mat_do_km2") or props.get("mat_do") or props.get("density") or "0")
            density_spoken = density.replace(".", ",")
            
            cap = props.get("cap") or "2"
            secretary = props.get("bi_thu") or props.get("bi_thu_ap") or "Chưa cập nhật"
            chairman = props.get("chu_tich") or "Chưa cập nhật"
            truong_ap = props.get("truong_ap") or props.get("truong_thon") or props.get("truong_ban") or "Chưa cập nhật"
            
            # Format text based on administrative level
            if loai.lower() in ["ấp", "ap", "thôn", "bản", "tổ dân phố", "khu phố"]:
                # Narration template for hamlets (Ấp)
                intro_text = f"Chào mừng bạn đến với {loai} {name}. Đây là đơn vị hành chính thuộc huyện Cầu Kè, tỉnh Trà Vinh. "
                
                if area != "0" and float(area) > 0:
                    intro_text += f"Về diện tích, {loai} {name} có diện tích tự nhiên là {area_spoken} ki-lô-mét vuông. "
                
                if pop != "0" and int(pop) > 0:
                    intro_text += f"Quy mô dân số của {loai} đạt khoảng {pop_spoken} người. "
                    if density != "0" and float(density) > 0:
                        intro_text += f"Mật độ dân số trung bình đạt {density_spoken} người trên một ki-lô-mét vuông. "
                
                if truong_ap != "Chưa cập nhật":
                    intro_text += f"Trưởng {loai} hiện tại là ông {truong_ap}. "
                elif secretary != "Chưa cập nhật":
                    intro_text += f"Bí thư chi bộ {loai} là ông {secretary}. "
            else:
                # Narration template for communes (Xã/Thị trấn)
                sap_nhap = props.get("sap_nhap", "")
                if sap_nhap:
                    sap_nhap_spoken = (
                        sap_nhap
                        .replace("Cầu Kè (thị trấn )", "thị trấn Cầu Kè")
                        .replace("Cầu Kè (thị trấn)", "thị trấn Cầu Kè")
                        .replace("Cầu Kè(thị trấn)", "thị trấn Cầu Kè")
                        .replace("Hòa Ân", "xã Hòa Ân")
                        .replace("Châu Điền", "xã Châu Điền")
                    )
                else:
                    sap_nhap_spoken = ""
                
                intro_text = (
                    f"Chào mừng bạn đến với {loai} {name}. Đây là đơn vị hành chính cấp xã thuộc huyện Cầu Kè, tỉnh Trà Vinh. "
                    f"Địa phương được xếp vào phân loại hành chính là {loai} cấp {cap}. \n\n"
                    f"Về số liệu địa lý, {loai} {name} có diện tích tự nhiên là {area_spoken} ki-lô-mét vuông. "
                    f"Quy mô dân số đạt {pop_spoken} người, với mật độ dân cư trung bình tương ứng là {density_spoken} người trên một ki-lô-mét vuông. "
                )
                
                if sap_nhap_spoken:
                    intro_text += f"Các khu vực giáp ranh hoặc sáp nhập của xã bao gồm: {sap_nhap_spoken}. \n\n"
                
                intro_text += (
                    f"Về ban lãnh đạo chủ chốt của địa phương hiện tại, Bí thư Đảng ủy là ông {secretary}, "
                    f"và Chủ tịch Ủy ban nhân dân là ông {chairman}."
                )
            
            print(f"Generating audio for code: {ma}...")
            output_file = os.path.join(audio_dir, f"{ma}.mp3")
            asyncio.run(generate_tts(intro_text, output_file))

if __name__ == "__main__":
    main()
