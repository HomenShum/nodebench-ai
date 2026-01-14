"use node";

/**
 * LinkedIn Posting Actions (Node.js)
 *
 * Handles actual LinkedIn API calls for posting content.
 * Requires Node.js runtime for HTTP requests.
 *
 * Required Environment:
 *   - LINKEDIN_CLIENT_ID: OAuth client ID (for generating new tokens)
 *   - LINKEDIN_CLIENT_SECRET: OAuth client secret (for token refresh)
 *
 * Required OAuth Scopes:
 *   - w_member_social: Post on behalf of member
 *   - openid, email: For authentication
 *
 * See: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 */

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const LINKEDIN_API_VERSION = "202411";
const LINKEDIN_API_BASE = "https://api.linkedin.com";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface LinkedInUserInfo {
  sub: string;          // person URN ID
  name?: string;
  email?: string;
  picture?: string;
}

interface LinkedInPostResult {
  success: boolean;
  postUrn?: string;
  postUrl?: string;
  error?: string;
}

interface LinkedInImageUploadResult {
  success: boolean;
  imageUrn?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal Actions - LinkedIn API Calls
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch and store user info after account connection
 */
export const fetchUserInfo = internalAction({
  args: { accountId: v.id("linkedinAccounts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(internal.domains.social.linkedinAccounts.getAccountById, {
      accountId: args.accountId,
    });

    if (!account) {
      console.error("[LinkedIn] Account not found:", args.accountId);
      return null;
    }

    try {
      const userInfo = await fetchLinkedInUserInfo(account.accessToken);

      if (userInfo) {
        await ctx.runMutation(internal.domains.social.linkedinAccounts.updateAccountInfo, {
          accountId: args.accountId,
          personUrn: `urn:li:person:${userInfo.sub}`,
          displayName: userInfo.name,
          email: userInfo.email,
          profilePictureUrl: userInfo.picture,
        });
      }
    } catch (error) {
      console.error("[LinkedIn] Failed to fetch user info:", error);
    }

    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Post Creation Actions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a text post on LinkedIn
 */
export const createTextPost = action({
  args: {
    text: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    postUrn: v.optional(v.string()),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<LinkedInPostResult> => {
    // Try to get user-specific LinkedIn account first
    const userId = await getAuthUserId(ctx);
    let accessToken: string | undefined;
    let personUrn: string | undefined;

    if (userId) {
      const account = await ctx.runQuery(internal.domains.social.linkedinAccounts.getAccountForUser, {
        userId,
      });

      if (account) {
        if (account.expiresAt && account.expiresAt < Date.now()) {
          return {
            success: false,
            error: "LinkedIn access token expired. Please reconnect your LinkedIn account.",
          };
        }
        accessToken = account.accessToken;
        personUrn = account.personUrn;
      }
    }

    // Fallback to system-level access token from environment
    if (!accessToken) {
      accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      if (!accessToken) {
        return {
          success: false,
          error: "LinkedIn not configured. Set LINKEDIN_ACCESS_TOKEN in Convex environment or connect your account.",
        };
      }
      // Fetch person URN using the token
      const userInfo = await fetchLinkedInUserInfo(accessToken);
      if (userInfo) {
        personUrn = `urn:li:person:${userInfo.sub}`;
      }
    }

    if (!personUrn) {
      return {
        success: false,
        error: "Could not determine LinkedIn profile URN. Please try again.",
      };
    }

    try {
      const result = await postToLinkedIn(
        accessToken,
        personUrn,
        args.text
      );
      return result;
    } catch (error) {
      console.error("[LinkedIn] Post creation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create post",
      };
    }
  },
});

/**
 * Create a post with an image on LinkedIn
 */
export const createImagePost = action({
  args: {
    text: v.string(),
    imageUrl: v.string(),
    altText: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    postUrn: v.optional(v.string()),
    postUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<LinkedInPostResult> => {
    // Try to get user-specific LinkedIn account first
    const userId = await getAuthUserId(ctx);
    let accessToken: string | undefined;
    let personUrn: string | undefined;

    if (userId) {
      const account = await ctx.runQuery(internal.domains.social.linkedinAccounts.getAccountForUser, {
        userId,
      });

      if (account) {
        if (account.expiresAt && account.expiresAt < Date.now()) {
          return {
            success: false,
            error: "LinkedIn access token expired. Please reconnect your LinkedIn account.",
          };
        }
        accessToken = account.accessToken;
        personUrn = account.personUrn;
      }
    }

    // Fallback to system-level access token from environment
    if (!accessToken) {
      accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      if (!accessToken) {
        return {
          success: false,
          error: "LinkedIn not configured. Set LINKEDIN_ACCESS_TOKEN in Convex environment or connect your account.",
        };
      }
      // Fetch person URN using the token
      const userInfo = await fetchLinkedInUserInfo(accessToken);
      if (userInfo) {
        personUrn = `urn:li:person:${userInfo.sub}`;
      }
    }

    if (!personUrn) {
      return {
        success: false,
        error: "Could not determine LinkedIn profile URN. Please try again.",
      };
    }

    try {
      // Step 1: Upload image
      const imageUpload = await uploadImageToLinkedIn(
        accessToken,
        personUrn,
        args.imageUrl
      );

      if (!imageUpload.success || !imageUpload.imageUrn) {
        return {
          success: false,
          error: imageUpload.error || "Failed to upload image to LinkedIn",
        };
      }

      // Step 2: Create post with image
      const result = await postToLinkedIn(
        accessToken,
        personUrn,
        args.text,
        imageUpload.imageUrn,
        args.altText
      );

      return result;
    } catch (error) {
      console.error("[LinkedIn] Image post creation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create image post",
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// LinkedIn API Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function getLinkedInHeaders(accessToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

async function fetchLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo | null> {
  const response = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
    headers: getLinkedInHeaders(accessToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LinkedIn] User info fetch failed:", response.status, errorText);
    return null;
  }

  return await response.json();
}

async function postToLinkedIn(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageUrn?: string,
  altText?: string
): Promise<LinkedInPostResult> {
  // Clean text - LinkedIn has restrictions on certain characters
  // Important: Normalize newlines and remove problematic Unicode
  // CRITICAL: Many Unicode characters cause LinkedIn to TRUNCATE posts silently!
  // CRITICAL: Parentheses () cause truncation - replace with brackets []!
  const cleanText = text
    .replace(/\r\n/g, '\n')           // Normalize Windows line endings
    .replace(/\r/g, '\n')             // Normalize old Mac line endings
    .replace(/\|/g, '-')              // CRITICAL: Pipe breaks LinkedIn posts!
    .replace(/[\u2500-\u257F]/g, '-') // Box drawing characters (━, ─, │, etc.)
    .replace(/[\u2018\u2019\u0060\u00B4\u2032\u2035]/g, "'")  // All quote variants to regular
    .replace(/[\u201C\u201D\u00AB\u00BB\u2033\u2036]/g, '"')  // All double quote variants
    .replace(/[\u2013\u2014\u2015\u2212]/g, '-')  // All dash variants to regular
    .replace(/[\u2026]/g, '...')      // Ellipsis to dots
    .replace(/[\u00A0\u2007\u202F\u2060]/g, ' ')  // All special spaces
    .replace(/[\u200B-\u200F\u2028-\u202E\uFEFF]/g, '') // Zero-width and direction chars
    .replace(/[\uFF08\u0028\(]/g, '[')  // CRITICAL: ALL parentheses to brackets!
    .replace(/[\uFF09\u0029\)]/g, ']')  // LinkedIn truncates at parentheses!
    .replace(/[\uFF3B]/g, '[')        // Fullwidth left bracket
    .replace(/[\uFF3D]/g, ']')        // Fullwidth right bracket
    .replace(/[\u2039\u203A]/g, "'")  // Single angle quotes
    .replace(/[\u2329\u232A\u27E8\u27E9]/g, '') // Angle brackets - remove
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '') // Control chars EXCEPT newline (\u000A)
    .replace(/[^\x20-\x7E\n\u00C0-\u024F\u1E00-\u1EFF#@$%&*[\]{}:;.,!?'"\/\\+=<>~^-]/g, ' ') // Keep safe chars (no parens!)
    .replace(/ +/g, ' ')              // Collapse multiple spaces
    .replace(/-{3,}/g, '---')         // Collapse multiple dashes to 3
    .replace(/\n{3,}/g, '\n\n')       // Max 2 consecutive newlines
    .trim()
    .substring(0, 3000);  // LinkedIn max is 3000 chars

  console.log(`[LinkedIn] Posting text (${cleanText.length} chars):\n${cleanText.substring(0, 200)}...`);

  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: cleanText,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
  };

  // Add image if provided
  if (imageUrn) {
    postBody.content = {
      media: {
        altText: altText || "",
        id: imageUrn,
      },
    };
  }

  const response = await fetch(`${LINKEDIN_API_BASE}/rest/posts`, {
    method: "POST",
    headers: getLinkedInHeaders(accessToken),
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    console.error("[LinkedIn] Post creation failed:", response.status, errorData);

    // Extract meaningful error message
    const errorMessage = errorData?.message
      || errorData?.serviceErrorCode
      || `LinkedIn API error: ${response.status}`;

    return { success: false, error: errorMessage };
  }

  // LinkedIn returns the post URN in the x-restli-id header
  const postUrn = response.headers.get("x-restli-id") || undefined;

  // Construct the post URL if we have the URN
  let postUrl: string | undefined;
  if (postUrn) {
    postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;
  }

  return {
    success: true,
    postUrn,
    postUrl,
  };
}

async function uploadImageToLinkedIn(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string
): Promise<LinkedInImageUploadResult> {
  // Step 1: Initialize upload
  const initResponse = await fetch(`${LINKEDIN_API_BASE}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: getLinkedInHeaders(accessToken),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    }),
  });

  if (!initResponse.ok) {
    const errorData = await initResponse.json().catch(() => ({}));
    console.error("[LinkedIn] Image upload init failed:", errorData);
    return { success: false, error: "Failed to initialize image upload" };
  }

  const initData = await initResponse.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

  if (!uploadUrl || !imageUrn) {
    return { success: false, error: "Invalid upload initialization response" };
  }

  // Step 2: Download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    return { success: false, error: `Failed to fetch image from URL: ${imageResponse.status}` };
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  // Step 3: Upload to LinkedIn
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    console.error("[LinkedIn] Image upload failed:", uploadResponse.status);
    return { success: false, error: `Image upload failed: ${uploadResponse.status}` };
  }

  return { success: true, imageUrn };
}
