"""Safe alpha restoration for the platypus's original eye whites.

An eye search window is not foreground. In particular, a bad template match
must never make an oval of the white studio background opaque.
"""
import cv2
import numpy as np


def enclosed_sclera_guard(area, center, axes):
    """Return alpha only for small, enclosed neutral components in the eye ROI.

    The color thresholds match the lower-body key, so grey antialiased sclera
    edges are restored along with white interiors. Exterior-connected pixels
    are always excluded, even if the eye locator accidentally points at them.
    """
    hi = area.max(2).astype(np.int16)
    lo = area.min(2).astype(np.int16)
    neutral = ((lo > 177) & ((hi - lo) < 47)).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(neutral, connectivity=4)
    exterior = set(np.unique(np.concatenate((
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ))).tolist())
    exterior.add(0)
    yy, xx = np.indices(labels.shape)
    cx, cy = center
    rx, ry = axes
    roi = ((xx - cx) / max(1, rx)) ** 2 + ((yy - cy) / max(1, ry)) ** 2 <= 1
    guard = np.zeros(labels.shape, dtype=np.uint8)
    for label in np.unique(labels[roi]):
        if int(label) in exterior:
            continue
        size = stats[label, cv2.CC_STAT_AREA]
        component = labels == label
        if size > np.pi * rx * ry:
            continue
        if np.count_nonzero(component & roi) < .9 * size:
            continue
        guard[component] = 255
    return cv2.GaussianBlur(guard, (3, 3), .65)
