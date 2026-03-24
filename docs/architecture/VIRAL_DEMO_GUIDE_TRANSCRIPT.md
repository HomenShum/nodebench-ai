# Every UI/UX Concept Explained in Under 10 Minutes

**Source:** [YouTube - Kole Jain](https://www.youtube.com/watch?v=EcbgbKtOELY)
**Creator:** Kole Jain (@KoleJain)
**Published:** 2026-03-14
**Duration:** 9:23 (563 seconds)
**Views:** ~127,670

---

## Full Transcript

### [0:00] Affordances & Signifiers

If you want to get good at UI/UX design, you got to start with the basics. So, let's begin. This one's easiest to explain with an example first. If I have three text and icon pairs, but I put a container around drinks and food, you know that they're related and dessert is not. Then, if I put a container around drinks, you know that it's selected and you can toggle over to food. And if I gray this text out, you know that it's inactive and clicking it probably won't do anything. See how you just knew all of that? I didn't need to write instructions on how it worked because the UI was signifying how things worked. Good UI has many signifiers like a button press state, highlights on active nav items, hover states, or even tool tips to tell the user what a UI affords or what it can do.

### [0:45] Visual Hierarchy

Now, take a look at this card. It displays all of the information in a logical, repeatable format, but it looks like a spreadsheet, not a design. So, let's give it some hierarchy, which is pretty intuitive. We have size, position, and color to use to our advantage. Starting from the top, an image always adds a great pop of color and makes scanning super easy. Just like Uber, if in this case the item is the most important, we want that large and bold and at the top because otherwise it'll blend in with something like the time and day, which can be below and much smaller. And it's this contrast, the difference between small and big, or colorful and not that actually creates the hierarchy. It's also why price should be at the top, right aligned, and blue. It's different than the rest, which draws the eye to it. The location should be smaller and below like this. But instead of just from and to, we can use icons and a line to demonstrate that it's moving from Jamesville to Syracuse without having to actually say that.

Now, with that said, it's not an exact science, and you could definitely end up with a design that looks like this instead. And it wouldn't be wrong, but the same ideas apply. Most important things near the top, bigger and colorful is more important, and images are used whenever possible. And as you start to design more and more, you'll notice that similar patterns arise when you need labels or buttons, which we're going to talk about in a minute.

### [2:04] Grids, Layouts & Spacing

Now, some people have this misconception that all of your content needs to align to a 12 column grid and be exactly 8 pixels apart, but these are just guidelines. For example, this design doesn't line up with any of the columns, and that's not uncommon, especially for custom landing pages. But for highly structured pages like galleries, blogs or any repeating content, they can actually be useful for responsiveness by giving guidelines for responsive behavior on tablet with eight columns and mobile with four. But much more important than using excessive grids and layouts is white space. Letting things breathe. For example, in a simple section like this, the large text would have a font size and line height like this, and the subtext would have a font size and line height like so. Buttons would be similar and optionally a top announcement bar like this. Then simply 32 pixels between every item, but you can also group elements that just go together like the announcement and text or the text and subtext which is just another form of visual hierarchy. And this is where we see the four-point grid system actually come into play. Everything is a multiple, not because it inherently looks better, but because you can always split things in half, which creates consistency throughout a design.

### [3:16] Typography & Font Sizing

Typography is really interesting because design is mostly just text. And for picking a font, I can almost unilaterally say you'll never need more than one for any design. So find a nice sans-serif font like the ones on screen and stick to it. Over the last 7 years of designing, I've rarely used any fonts other than what's on screen, and this shouldn't be where you're spending tons of time. I'm also not a big fan of calling any design skill a hack, but this one kind of is. This design looks okay right now, but our header text feels a little too loose. If you tighten up the letter spacing on this by about -2 to -3% and drop the line height to about 110 to 120%, it instantly makes any larger text look super pro real fast.

But hierarchy with typography is a little bit more nuanced. And if we look at our previous example, text sizes can vary wildly. For landing pages and websites, you generally don't want more than six font sizes, which can have a really large range. For things like dashboards, that range shrinks dramatically to where you don't normally have text sizes larger than 24 pixels because of the increase in information density.

But honestly, one of the most important concepts of design is getting inspiration and doing research from a good source like today's sponsor, Mobbin, who curates hundreds of thousands of mobile and web apps along with landing pages and emails to browse, search, and filter by platform, flow, and UI pattern. It's essentially the biggest and best library of real world design examples curated by some of the best design teams in the world. And if you're struggling with a specific section, just go and search for it and instantly pull up real world examples with links to the live sites, too.

### [4:55] Color Theory

Colors are difficult and everyone has their own tastes, but I'm a big fan of starting with one primary color. Generally, this is your brand color. Then you can lighten it for a good background or darken it for text colors. Both good ways to incorporate subtle color and make an otherwise drab design look much more interesting. And with all of that, we're already halfway to a color ramp, which is what large companies use to build out chips, states, charts, and really anything else. But I also think it's important as a beginner to let the color find you. Like an announcement bar to grab attention or a focus state on an input or a green new chip on a link. These are all semantic colors, which are colors that have meaning and provide signifiers to the user. Blue for trust, red for danger or urgency, yellow for warning, and green for success. Make sure you use color for purpose, not just for decoration.

### [5:47] Dark Mode

Now, designing in dark mode presents some pretty interesting challenges for us. First, this card is using a light border, which creates a bit too much contrast, so we'll lower that down. In dark mode, we don't have shadows like light mode. So, to create depth, we need to have a lighter card than the background. So, I'll make that adjustment. This chip is also far too bright, so we can dim down the saturation and brightness and flip that for the text to create some hierarchy. There's also a ton of flexibility for deep purples, reds, or greens, not just navy blue or gray.

### [6:19] Shadows

But speaking of depth, shadows are a fantastic tool to use on light mode. This shadow, along with most, is too strong. So reducing the opacity and dialing up the blur helps a lot. The strength you'll need depends on the foreground and background, but cards require less, while content that sits above other content, like popovers, will need stronger shadows. We can even use these techniques with inner and outer shadows to create effects like raised tactile buttons. Just remember, if the shadow is the first thing you notice on a design, you're not using it right.

### [6:53] Icons & Buttons

Now, to create strong designs, you'll need icons. Most icons are generally too large. So, the trick is to get the line height of your font, in this case 24 pixels, and make the icons the same size. And then tighten up the text. Sidebar links like this are actually just buttons without a background until you hover, which are often called ghost buttons. And if we isolate one and center it, we've got a perfect standalone button. These are super common when you have a primary and secondary CTA side by side. And a good guideline for padding on these is to double the height for the width. And these can be done with or without icons, too.

### [7:29] Feedback & States

A good rule of design is when a user does anything, there should be a response. For example, every button needs at least four states: default, hovered, active, or pressed, and disabled. Sometimes you'll need a loading state, too, with a spinner. Inputs are even more critical. You'll need a focus state when the user clicks in, error states with red borders, and messages when something's wrong, and sometimes even warning states for optional issues. And this applies everywhere. Loading spinners when data is fetching, success messages when an action completes, even micro animations on scroll or swipe. Every interaction needs a response.

### [8:07] Micro Interactions

And that brings us wonderfully into micro interactions. Micro interactions are a form of feedback, but they set things up a notch. For example, this copy button has states and feedback when we hover and click, but we still don't know that we've copied anything. Instead, if we have this chip slide up, that's a micro interaction that confirms our action. And these can range from highly practical to much more fun and playful.

### [8:36] Overlays

Finally, overlays are really important because if you screw them up, you're going to ruin the image and the text, too. In this case, we can't leave it as is. So, we could add in a full screen overlay, but it doesn't do the image justice. So instead add in a linear gradient that'll display the image then smoothly convert into a text readable background. Or if we're going for extra fancy we can add in a progressive blur on top of the gradient for an even more modern look.

And that is more or less every UI/UX concept all wrapped up in 10 minutes. If you want to check out Mobbin, it will be the first link down below and you can get the link to all of the Figma assets used in this video down there too. Thank you so much for watching and I will see you in the next one.

---

## Key Principles & Frameworks

### 1. Affordances & Signifiers
- **Core idea:** UI elements should communicate their function without instructions
- **Signals:** containers group related items, selection states show active items, grayed-out text signals inactivity
- **Examples:** button press states, active nav highlights, hover states, tooltips

### 2. Visual Hierarchy (Size, Position, Color)
- **The three levers:** size, position, color
- **Rule:** most important content goes top, large, bold, colorful
- **Contrast creates hierarchy:** the difference between small/big, colorful/muted is what draws the eye
- **Images always help:** they add color and make scanning easy
- **Icons replace labels:** visual demonstration over textual explanation (e.g., route line vs "from/to")

### 3. Grids & Spacing
- **12-column grids are guidelines, not rules** -- custom landing pages often break them
- **Grids are most useful for:** galleries, blogs, repeating content, responsive breakpoints (12 desktop, 8 tablet, 4 mobile)
- **White space matters more than grid alignment** -- let things breathe
- **4-point grid system:** everything in multiples of 4, not because it looks better inherently, but because halving always works cleanly
- **32px between sections** as a starting baseline

### 4. Typography
- **One font is enough** -- find a good sans-serif and stick with it
- **The "hack":** tighten letter spacing to -2% to -3% and drop line height to 110-120% on headers -- instant pro look
- **Font size count:** max 6 sizes for websites/landing pages; dashboards shrink the range (max ~24px)
- **Research real products** for inspiration on type hierarchies

### 5. Color Theory
- **Start with one primary brand color** -- lighten for backgrounds, darken for text
- **Color ramps:** systematic lightness scales for chips, states, charts
- **Semantic colors:** blue=trust, red=danger, yellow=warning, green=success
- **Rule: color for purpose, not decoration**
- **Let color find you:** announcement bars, focus states, status chips

### 6. Dark Mode Design
- **Lower border contrast** -- light borders on dark backgrounds are too harsh
- **Depth via lightness, not shadows** -- lighter cards on darker backgrounds
- **Dim saturation and brightness** on chips/accents
- **Flexibility in palette:** deep purples, reds, greens work -- not just navy/gray

### 7. Shadows
- **Most shadows are too strong** -- reduce opacity, increase blur
- **Shadow strength by elevation:** cards < popovers < modals
- **Inner + outer shadows** create tactile effects (raised buttons)
- **Test: if the shadow is the first thing you notice, it's too much**

### 8. Icons & Buttons
- **Icon size = line height of adjacent text** (e.g., 24px)
- **Ghost buttons:** no background until hover (sidebar links are just ghost buttons)
- **Button padding rule:** width = 2x height
- **Primary + secondary CTAs** side by side is a common pattern

### 9. Feedback & States
- **Every action needs a response** -- this is a design rule, not optional
- **Button states (minimum 4):** default, hover, active/pressed, disabled
- **Optional 5th:** loading (spinner)
- **Input states:** default, focus, error (red border + message), warning
- **System states:** loading spinners, success messages, micro animations

### 10. Micro Interactions
- **Feedback++** -- they confirm the action, not just acknowledge the click
- **Example:** copy button shows a sliding chip confirmation instead of just a state change
- **Range:** from purely practical to fun/playful
- **Key differentiator:** they tell the user what HAPPENED, not just that something was clicked

### 11. Overlays
- **Problem:** text on images is often unreadable
- **Solution hierarchy:** full overlay (heavy-handed) < linear gradient (better) < gradient + progressive blur (best, most modern)
- **Progressive blur on gradient** = the current best practice for text-over-image

---

## Actionable Takeaways for Product Demos & UI

### First 5 Seconds: Grab Attention
1. **Use visual hierarchy aggressively** -- the most important element should be unmistakably large, bold, and positioned at the top
2. **Add an image or visual anchor** -- images add pop and make scanning instant
3. **Use semantic color** to direct the eye -- one accent color draws focus

### Make It Feel Professional Instantly
4. **Tighten header letter spacing (-2 to -3%) and line height (110-120%)** -- the single highest-ROI typography tweak
5. **Use one good sans-serif font** -- don't waste time font shopping
6. **Apply the 4-point grid** for consistent spacing (32px between major sections)

### Make It Feel Alive
7. **Every interactive element needs 4+ states** -- no dead-feeling buttons
8. **Add micro interactions for confirmations** -- users should know what happened, not just that they clicked
9. **Loading states everywhere** -- spinners, skeleton screens, progress indicators

### Dark Mode (Relevant for NodeBench)
10. **Depth via card lightness, not shadows** -- lighter surfaces = higher elevation
11. **Lower border opacity** -- `border-white/[0.06]` is in the right range
12. **Dim accent saturation** in dark contexts -- too-bright chips look wrong

### Overlays & Hero Sections
13. **Linear gradient + progressive blur** for text over images -- the modern standard
14. **Never use a flat full-screen overlay** -- it kills the image

### Research & Inspiration
15. **Study real products** (Mobbin, Dribbble, live sites) before designing
16. **Notice repeating patterns** -- similar problems have similar UI solutions across apps

---

## Application to NodeBench

| Concept | Current State | Improvement Opportunity |
|---------|--------------|------------------------|
| Visual hierarchy | Strong -- glass cards, terracotta accent | Ensure hero metric is unmistakably the largest element |
| Typography | Manrope + JetBrains Mono, good pairing | Apply -2% letter spacing to section headers if not already |
| Spacing | Consistent glass card padding | Verify 4-point grid compliance across surfaces |
| Dark mode depth | `bg-white/[0.02]` cards on `#151413` | Correct -- lighter cards on darker bg |
| Border contrast | `border-white/[0.06]` | Correct -- low-contrast borders per dark mode principles |
| Button states | Agent panel has demo states | Ensure all 4 states (default/hover/active/disabled) on every CTA |
| Micro interactions | Thinking animation in agent panel | Add confirmation micro interactions for copy, save, share actions |
| Overlays | Used in some hero sections | Use gradient + progressive blur for any text-over-image |
| Feedback | Loading states in research hub | Verify every surface has loading/empty/error states |
| Semantic color | Terracotta accent, status indicators | Ensure blue=trust, red=danger, green=success consistent across all surfaces |
