import os
import json
import asyncio
import edge_tts
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def generate_tts_with_retry(text: str, output_path: str, retries=5, delay=3):
    voice = "vi-VN-HoaiMyNeural"
    for attempt in range(1, retries + 1):
        try:
            print(f"Generating TTS (Attempt {attempt}/{retries}) for: {os.path.basename(output_path)}...")
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)
            # Verify file size after generation
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                print(f"Success: Saved audio to {output_path} ({os.path.getsize(output_path)} bytes)")
                return True
            else:
                raise ValueError("Generated file is empty or too small.")
        except Exception as e:
            print(f"Error on attempt {attempt}: {e}")
            if attempt < retries:
                print(f"Waiting {delay} seconds before retrying...")
                await asyncio.sleep(delay)
                delay *= 2 # Exponential backoff
            else:
                print(f"Failed to generate TTS after {retries} attempts.")
                raise e
    return False

def clean_value(val):
    if val is None:
        return "0"
    return str(val).strip()

async def process_files():
    geojson_dir = "map data"
    audio_dir = "audio"
    
    if not os.path.exists(audio_dir):
        os.makedirs(audio_dir)
        
    geojson_files = [f for f in os.listdir(geojson_dir) if f.endswith(".geojson")]
    print(f"Found {len(geojson_files)} GeoJSON file(s) to process.")
    
    for file_name in geojson_files:
        geojson_path = os.path.join(geojson_dir, file_name)
        
        try:
            with open(geojson_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading {file_name}: {e}")
            continue
            
        if not isinstance(data, dict):
            continue
            
        features = data.get("features", [])
        
        for index, feature in enumerate(features):
            props = feature.get("properties", {})
            ma = clean_value(props.get("ma") or props.get("id") or f"audio_{index}")
            name = props.get("ten") or props.get("name") or "Chưa rõ tên"
            loai = props.get("loai") or "Ấp"
            
            if name == "Cầu Kè" or ma == "30050":
                print(f"Skipping commune level boundary: {name}")
                continue
                
            area_ha = clean_value(props.get("dien_tich_ha") or "0")
            area_ha_spoken = area_ha.replace(".", ",")
            
            pop = clean_value(props.get("dan_so") or "0")
            pop_spoken = pop.replace(".", "")
            
            # Format clean name (avoid "Ấp Ấp Giồng Lớn")
            clean_name = name
            if name.lower().startswith(loai.lower()):
                clean_name = name[len(loai):].strip()
                
            intro_text = f"Chào mừng bạn đến với {loai} {clean_name}. Đây là đơn vị hành chính thuộc huyện Cầu Kè, tỉnh Trà Vinh. "
            
            if area_ha != "0" and float(area_ha) > 0:
                intro_text += f"Về diện tích, {loai} {clean_name} có diện tích tự nhiên là {area_ha_spoken} héc-ta. "
            
            if pop != "0" and int(pop) > 0:
                intro_text += f"Quy mô dân số của {loai} đạt khoảng {pop_spoken} người. "
            
            output_file = os.path.join(audio_dir, f"{ma}.mp3")
            
            print(f"Text for {ma} ({loai} {clean_name}): {intro_text}")
            await generate_tts_with_retry(intro_text, output_file)
            await asyncio.sleep(1.5) # Sleep to avoid rate limiting

def main():
    asyncio.run(process_files())

if __name__ == "__main__":
    main()
