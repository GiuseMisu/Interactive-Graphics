/**
 * Blends a foreground image onto a background image using alpha compositing.
 * 
 * This function modifies the background image by overlaying the foreground image 
 * at a specified position, taking into account the opacity and transparency of 
 * both images. The foreground image may be partially or fully outside the background 
 * boundaries, and only the overlapping pixels are blended.
 * 
 * @param {ImageData} bgImg - The background image to be modified.
 * @param {ImageData} fgImg - The foreground image to be composited onto the background.
 * @param {number} fgOpac   - The opacity of the foreground image (0 to 1).
 * @param {Object} fgPos    - The position of the foreground image in pixels. 
 *                            It can be negative, and (0,0) aligns the top-left corners.
 */

function composite(bgImg, fgImg, fgOpac, fgPos) {
    var fg_h = fgImg.height;
    var fg_w = fgImg.width;
    var fg_x = fgPos.x;
    var fg_y = fgPos.y;
    var bg_data = bgImg.data; // 1D array of pixels in RGBA format

    // Loop through the foreground image
    for (var i = 0; i < fg_h; i++) {
        for (var j = 0; j < fg_w; j++) {
            var new_x = fg_x + j; //if aligned, fg_x = 0, so new_x = j
            var new_y = fg_y + i; //if aligned, fg_y = 0, so new_y = i

            // Check if the pixel is inside the background image
            if (new_x >= 0 && new_x < bgImg.width && new_y >= 0 && new_y < bgImg.height) {
                //console.log("Pixel is inside the background image");
                
                var fg_index = (i * fg_w + j) * 4; // 4 channels (RGBA) per pixel
                var bg_index = (new_y * bgImg.width + new_x) * 4;

                var fg_red = fgImg.data[fg_index];
                var fg_green = fgImg.data[fg_index + 1];
                var fg_blue = fgImg.data[fg_index + 2]; 
                var fg_alpha = (fgImg.data[fg_index + 3] / 255) * fgOpac; // Normalize alpha

                var bg_red = bg_data[bg_index];
                var bg_green = bg_data[bg_index + 1];
                var bg_blue = bg_data[bg_index + 2];
                var bg_alpha = bg_data[bg_index + 3] / 255; // Normalize alpha

                // Compute final alpha
                var a = fg_alpha + (1 - fg_alpha) * bg_alpha;

                var new_red, new_green, new_blue;
                if (a > 0) { // Avoid division by zero
                    new_red = (fg_alpha * fg_red + (1 - fg_alpha) * bg_alpha * bg_red) / a;
                    new_green = (fg_alpha * fg_green + (1 - fg_alpha) * bg_alpha * bg_green) / a;
                    new_blue = (fg_alpha * fg_blue + (1 - fg_alpha) * bg_alpha * bg_blue) / a;
                } else {
                    new_red = bg_red;
                    new_green = bg_green;
                    new_blue = bg_blue;
                }

                bg_data[bg_index] = new_red;
                bg_data[bg_index + 1] = new_green;
                bg_data[bg_index + 2] = new_blue;
                bg_data[bg_index + 3] = a * 255; // Convert alpha back to 0-255 range
            }
            else{
                //console.log("Pixel is OUTSIDE the background image, NOT COMPOSITED");
                continue;
            } 
        }
    }
}
    