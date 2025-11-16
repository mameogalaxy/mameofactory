from PIL import Image

img = Image.open('images/original/PumpkinFace.png')
upscaled = img.resize((img.width * 4, img.height * 4), Image.LANCZOS)
upscaled.save('images/upscaled/PumpkinFace.png')
print(f'Upscaled: {img.size} -> {upscaled.size}')
