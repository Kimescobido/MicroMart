from PIL import Image, ImageDraw

SIZE = 1024
SCALE = 3
CREAM = "#FFFBF7"
BURGUNDY = "#932D2C"
INK = "#24211D"


def draw_mark(color, background=None, inner_color=None):
    side = SIZE * SCALE
    image = Image.new("RGBA", (side, side), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def box(coords):
        return tuple(round(value * SCALE) for value in coords)

    # Eight pins give the central mark a clear microcontroller silhouette.
    for center in (370, 512, 654):
        draw.rounded_rectangle(box((center - 23, 180, center + 23, 315)), radius=18 * SCALE, fill=color)
        draw.rounded_rectangle(box((center - 23, 709, center + 23, 844)), radius=18 * SCALE, fill=color)
        draw.rounded_rectangle(box((180, center - 23, 315, center + 23)), radius=18 * SCALE, fill=color)
        draw.rounded_rectangle(box((709, center - 23, 844, center + 23)), radius=18 * SCALE, fill=color)

    draw.rounded_rectangle(box((270, 270, 754, 754)), radius=112 * SCALE, fill=color)

    # A simple M circuit trace sits inside the chip. Its thick strokes remain legible at small sizes.
    inner = inner_color or (CREAM if color == BURGUNDY else INK)
    line_width = 48 * SCALE
    points = [(365, 650), (365, 390), (512, 530), (659, 390), (659, 650)]
    draw.line([(x * SCALE, y * SCALE) for x, y in points], fill=inner, width=line_width, joint="curve")
    for x, y in (points[0], points[-1]):
        draw.ellipse(box((x - 30, y - 30, x + 30, y + 30)), fill=inner)

    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main():
    draw_mark(BURGUNDY, CREAM).convert("RGB").save("assets/images/micromart-icon.png", quality=95)
    draw_mark(BURGUNDY).save("assets/images/micromart-android-foreground.png")
    draw_mark("#000000", inner_color=(0, 0, 0, 0)).save("assets/images/micromart-android-monochrome.png")
    Image.open("assets/images/micromart-icon.png").resize((48, 48), Image.Resampling.LANCZOS).save("assets/images/micromart-favicon.png")


if __name__ == "__main__":
    main()
