"""Prepare a test copy with Metal Slug 6 selected at collection menu startup."""
import argparse
import hashlib
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("original", type=Path)
parser.add_argument("destination", type=Path)
args = parser.parse_args()
image = bytearray(args.original.read_bytes())
if hashlib.sha256(image).hexdigest() != "62a852830ffc507b4c30d17ef8c32a32d3888de603f185829e95b31fa8518f5b":
    parser.error("Unsupported MetalSlug.exe version")
# The collection restores the horizontal selection both on menu creation and
# after its opening animation. Slot 6 is Metal Slug 6 in this executable.
for offset, expected, replacement in (
    (0x16FB, "8a8529050000", "b00690909090"),
    (0x18CE, "8a8e29050000", "b10690909090"),
):
    if image[offset:offset + 6] != bytes.fromhex(expected):
        parser.error("Unexpected collection menu instruction")
    image[offset:offset + 6] = bytes.fromhex(replacement)
with args.destination.open("xb") as output:
    output.write(image)
