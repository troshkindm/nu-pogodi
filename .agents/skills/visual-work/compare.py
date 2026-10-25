import argparse

from PIL import Image, ImageFilter, ImageStat

BLUR_RADIUS = 6


def texture_stats(image, box):
    width, height = image.size
    crop = image.crop((int(box[0] * width), int(box[1] * height), int(box[2] * width), int(box[3] * height)))
    low = ImageStat.Stat(crop.filter(ImageFilter.GaussianBlur(BLUR_RADIUS)))
    full = ImageStat.Stat(crop)
    high = [max(f * f - l * l, 0) ** 0.5 for f, l in zip(full.stddev, low.stddev)]
    return [round(m) for m in full.mean], [round(s, 1) for s in low.stddev], [round(s, 1) for s in high]


def side_by_side(images, gap=10):
    width = sum(image.width for image in images) + gap * (len(images) - 1)
    canvas = Image.new('RGB', (width, max(image.height for image in images)), (24, 24, 24))
    x = 0
    for image in images:
        canvas.paste(image, (x, 0))
        x += image.width + gap
    return canvas


def main():
    parser = argparse.ArgumentParser(
        description='Compare a render with a reference: mean colour, low-frequency (mottling) and high-frequency (grain) spread.'
    )
    parser.add_argument('reference')
    parser.add_argument('render')
    parser.add_argument('--box', action='append', default=[], help='relative crop x1,y1,x2,y2; repeatable')
    parser.add_argument('--out', default='compare.jpg', help='side-by-side image path')
    args = parser.parse_args()

    render = Image.open(args.render).convert('RGB')
    reference = Image.open(args.reference).convert('RGB').resize(render.size, Image.LANCZOS)
    for raw in args.box or ['0,0,1,1']:
        box = [float(value) for value in raw.split(',')]
        print(f'box {raw}')
        print(f'  reference  mean {texture_stats(reference, box)[0]}  low {texture_stats(reference, box)[1]}  high {texture_stats(reference, box)[2]}')
        print(f'  render     mean {texture_stats(render, box)[0]}  low {texture_stats(render, box)[1]}  high {texture_stats(render, box)[2]}')
    side_by_side([reference, render]).save(args.out, quality=90)
    print(f'side by side: {args.out}')


if __name__ == '__main__':
    main()
