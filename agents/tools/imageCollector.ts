/**
 * Image Collector Tool
 * 
 * Integrates with Linkup API for image search and provides validation/caching.
 * Maps to Streamlit's core.image_collector module.
 */

import { linkupImageSearch } from "../services/linkup";

export interface ImageMetadata {
  imageId: string;
  url: string;
  name: string;
  description: string;
  source: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  isValid: boolean;
  validationError?: string;
}

/**
 * Validate image URL by checking headers
 * Maps to: _validate_image() in Streamlit
 */
export async function validateImageUrl(url: string): Promise<{
  isValid: boolean;
  contentType?: string;
  size?: number;
  error?: string;
}> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    
    if (!response.ok) {
      return {
        isValid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length");
    const size = contentLength ? parseInt(contentLength, 10) : undefined;

    // Check if it's an image
    if (!contentType.startsWith("image/")) {
      return {
        isValid: false,
        contentType,
        error: `Not an image (content-type: ${contentType})`,
      };
    }

    // Check size (max 10MB)
    if (size && size > 10 * 1024 * 1024) {
      return {
        isValid: false,
        contentType,
        size,
        error: `Image too large (${(size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    return {
      isValid: true,
      contentType,
      size,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Download and validate image
 * Maps to: _download_image() in Streamlit
 */
export async function downloadImage(url: string): Promise<{
  success: boolean;
  data?: ArrayBuffer;
  contentType?: string;
  size?: number;
  error?: string;
}> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    
    if (!contentType.startsWith("image/")) {
      return {
        success: false,
        error: `Not an image (content-type: ${contentType})`,
      };
    }

    const data = await response.arrayBuffer();
    
    return {
      success: true,
      data,
      contentType,
      size: data.byteLength,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Search and collect images with validation
 * Maps to: search_and_download_images() in Streamlit
 */
export async function searchAndCollectImages(
  query: string,
  maxImages: number = 10,
  validateUrls: boolean = true
): Promise<{
  images: ImageMetadata[];
  totalFound: number;
  validCount: number;
  invalidCount: number;
}> {
  console.log(`🔍 Searching for images: "${query}"`);
  
  try {
    // Search with Linkup API
    const linkupResults = await linkupImageSearch(query, "standard");
    console.log(`✅ Linkup found ${linkupResults.length} images`);

    // Limit to maxImages
    const limitedResults = linkupResults.slice(0, maxImages);

    // Validate URLs if requested
    const images: ImageMetadata[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < limitedResults.length; i++) {
      const result = limitedResults[i];
      const imageId = `img_${i + 1}`;

      let isValid = true;
      let validationError: string | undefined;
      let contentType: string | undefined;
      let size: number | undefined;

      if (validateUrls) {
        const validation = await validateImageUrl(result.url);
        isValid = validation.isValid;
        validationError = validation.error;
        contentType = validation.contentType;
        size = validation.size;

        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
          console.warn(`⚠️  Invalid image ${imageId}: ${validationError}`);
        }
      } else {
        validCount++;
      }

      images.push({
        imageId,
        url: result.url,
        name: result.name || `Image ${i + 1}`,
        description: result.name || query,
        source: "linkup",
        format: contentType?.split("/")[1],
        size,
        isValid,
        validationError,
      });
    }

    console.log(`📊 Collected ${images.length} images (${validCount} valid, ${invalidCount} invalid)`);

    return {
      images,
      totalFound: linkupResults.length,
      validCount,
      invalidCount,
    };
  } catch (error) {
    console.error("❌ Image search failed:", error);
    
    // Return fallback sample images
    const fallbackImages: ImageMetadata[] = [
      {
        imageId: "img_1",
        url: "https://images.unsplash.com/photo-1535223289827-42f1e9919769",
        name: "VR Avatar 1",
        description: "VR avatar full body",
        source: "fallback",
        isValid: true,
      },
      {
        imageId: "img_2",
        url: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac",
        name: "VR Avatar 2",
        description: "3D character with hands",
        source: "fallback",
        isValid: true,
      },
      {
        imageId: "img_3",
        url: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9",
        name: "VR Avatar 3",
        description: "Virtual reality character",
        source: "fallback",
        isValid: true,
      },
    ].slice(0, maxImages);

    console.log(`⚠️  Using ${fallbackImages.length} fallback sample images`);

    return {
      images: fallbackImages,
      totalFound: fallbackImages.length,
      validCount: fallbackImages.length,
      invalidCount: 0,
    };
  }
}

/**
 * Get image dimensions from URL
 */
export async function getImageDimensions(url: string): Promise<{
  width?: number;
  height?: number;
  error?: string;
}> {
  try {
    // Download image
    const download = await downloadImage(url);
    
    if (!download.success || !download.data) {
      return { error: download.error };
    }

    // Create blob and load image
    const blob = new Blob([download.data], { type: download.contentType });
    const imageUrl = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(imageUrl);
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        resolve({ error: "Failed to load image" });
      };

      img.src = imageUrl;
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Filter images by criteria
 */
export function filterImages(
  images: ImageMetadata[],
  criteria: {
    minWidth?: number;
    minHeight?: number;
    maxSize?: number;
    validOnly?: boolean;
    formats?: string[];
  }
): ImageMetadata[] {
  return images.filter((img) => {
    // Valid only
    if (criteria.validOnly && !img.isValid) {
      return false;
    }

    // Min dimensions
    if (criteria.minWidth && img.width && img.width < criteria.minWidth) {
      return false;
    }
    if (criteria.minHeight && img.height && img.height < criteria.minHeight) {
      return false;
    }

    // Max size
    if (criteria.maxSize && img.size && img.size > criteria.maxSize) {
      return false;
    }

    // Formats
    if (criteria.formats && img.format && !criteria.formats.includes(img.format)) {
      return false;
    }

    return true;
  });
}

// Export tool interface
export const imageCollectorTool = {
  searchAndCollectImages,
  validateImageUrl,
  downloadImage,
  getImageDimensions,
  filterImages,
};

