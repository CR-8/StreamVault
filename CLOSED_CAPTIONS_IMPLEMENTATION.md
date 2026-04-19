# Closed Captions Implementation Plan for StreamVault

**Status**: Planning Phase
**Priority**: Medium (improves UX for Kids & Animation content)
**Estimated Effort**: 6-8 hours
**Target Audience**: Kids, Animation, Foreign Language Streams

---

## Overview

This document outlines the complete implementation plan to add closed caption (CC) and subtitle support to StreamVault's HLS player. Many IPTV streams, especially in Kids and Animation categories, broadcast with embedded subtitle tracks that are currently being ignored.

---

## 1. Current State Analysis

### What's Already Available
- ✅ HLS.js supports subtitle/caption loading via `hls.Events.SUBTITLE_TRACKS_UPDATED`
- ✅ Browser has native video caption API (`TextTrack`, `TextTrackCue`)
- ✅ Zustand store can persist user preferences
- ✅ UI controls system in place

### What's Missing
- ❌ M3U parser doesn't extract `#EXT-X-MEDIA` or `#EXT-X-SUBTITLES` directives
- ❌ Channel data model has no subtitle track storage
- ❌ HLS player doesn't load or enable subtitle tracks
- ❌ No UI controls for selecting captions (CC button, language selection)
- ❌ No user preference persistence for CC state

---

## 2. Data Model Changes

### 2.1 Update Type Definitions (`src/types/index.ts`)

Add subtitle track interface:

```typescript
export interface SubtitleTrack {
  id: string           // Unique identifier (lang code or sequence)
  language: string     // ISO 639-1 code (e.g., 'en', 'es', 'fr')
  name?: string        // Display name (e.g., 'English', 'Spanish')
  url: string          // Direct URL to subtitle file (VTT/SRT)
  default?: boolean    // Is this the default track?
  default_cc?: boolean // Is this the default closed caption?
  forced?: boolean     // Forced subtitles (signs/sound effects only)
  autoSelect?: boolean // Auto-select in player
}

export interface Channel {
  // ... existing fields ...
  subtitles?: SubtitleTrack[]  // NEW: Available subtitle tracks
}
```

### 2.2 Add CC Preferences to Store

Update `src/store/useStreamVaultStore.ts`:

```typescript
export interface StreamVaultStore {
  // ... existing state ...
  ccEnabled: boolean                        // CC visibility toggle
  ccLanguage: string                        // Selected language code
  ccFontSize: 'small' | 'medium' | 'large' // Font size preference
  
  // New actions
  toggleCC: (enabled: boolean) => void
  setCCLanguage: (lang: string) => void
  setCCFontSize: (size: 'small' | 'medium' | 'large') => void
}
```

Persist via `localStorage`:
```typescript
// In persist config
storage.setItem('streamvault:cc-enabled', store.ccEnabled)
storage.setItem('streamvault:cc-language', store.ccLanguage)
storage.setItem('streamvault:cc-font-size', store.ccFontSize)
```

---

## 3. M3U Parser Enhancement

### 3.1 Update Parser (`src/lib/m3u-parser.ts`)

#### New Helper Functions

```typescript
/**
 * Extract all subtitle tracks from HLS manifest.
 * Looks for #EXT-X-MEDIA tags with TYPE=SUBTITLES
 * Also checks for #EXT-X-SUBTITLES tags (older HLS spec)
 */
function extractSubtitleTracks(text: string, baseUrl: string): SubtitleTrack[] {
  const tracks: SubtitleTrack[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (line.includes('#EXT-X-MEDIA')) {
      // Parse: #EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="es",NAME="Español",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,URI="subs.m3u8"
      if (!line.includes('TYPE=SUBTITLES')) continue
      
      const track: SubtitleTrack = {
        id: extractAttr(line, 'LANGUAGE') || extractAttr(line, 'GROUP-ID'),
        language: extractAttr(line, 'LANGUAGE'),
        name: extractAttr(line, 'NAME'),
        url: resolveUrl(extractAttr(line, 'URI'), baseUrl),
        default: line.includes('DEFAULT=YES'),
        default_cc: line.includes('DEFAULT=YES'),
        forced: line.includes('FORCED=YES'),
        autoSelect: line.includes('AUTOSELECT=YES'),
      }
      
      if (track.url) tracks.push(track)
    }
    
    if (line.includes('#EXT-X-SUBTITLES')) {
      // Older spec: #EXT-X-SUBTITLES="subtitles.vtt"
      const url = resolveUrl(extractAttr(line, ''), line.split('"')[1], baseUrl)
      if (url) {
        tracks.push({
          id: 'default',
          language: 'unknown',
          url,
          default: true,
        })
      }
    }
  }
  
  return tracks
}

// Helper to resolve relative URLs
function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  try {
    return new URL(url, baseUrl).toString()
  } catch {
    return ''
  }
}
```

#### Integrate into parseM3U()

```typescript
export function parseM3U(text: string, packId: string): Channel[] {
  // ... existing Phase 1 & 2 logic ...
  
  // NEW: Extract subtitle tracks from main playlist
  const globalSubtitles = extractSubtitleTracks(text, packId)
  
  // When creating/merging channels, attach subtitles
  const channel: Channel = {
    // ... existing fields ...
    subtitles: globalSubtitles || [],  // NEW
  }
  
  return channels
}
```

---

## 4. HLS Player Enhancement

### 4.1 Update HLS.js Configuration (`src/components/hls-player.tsx`)

#### Enable Subtitle Loading

```typescript
const hls = new Hls({
  // ... existing config ...
  
  // NEW: Subtitle settings
  subtitleTrackController: {
    textTrackDisplay: true,  // Use browser's TextTrack API
  },
  subtitlePreference: {
    preferredLanguage: userStore.ccLanguage,  // Use stored preference
    autoSelectLanguage: true,
  },
})
```

#### Handle Subtitle Track Events

```typescript
// After hls.attachMedia(video)

// Listen for discovered subtitle tracks
hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
  const tracks = data.subtitleTracks
  // Dispatch to UI (store or state)
  setAvailableSubtitles(tracks)
  
  // Auto-select based on user preference
  const preferred = tracks.find(t => t.lang === ccLanguage)
  if (preferred) {
    hls.subtitleTrack = preferred.id
  }
})

// Listen for subtitle track changes
hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
  // Update UI to show current selection
  setCurrentSubtitleTrack(data.subtitleTrack)
})
```

#### Add Subtitle Track Selection Method

```typescript
const selectSubtitleTrack = (trackId: number | -1) => {
  const hls = hlsRef.current
  if (!hls) return
  
  hls.subtitleTrack = trackId  // -1 disables subtitles
  
  // Persist preference
  setCCLanguage(trackId >= 0 ? availableSubtitles[trackId]?.lang : '')
}

const toggleSubtitles = () => {
  const hls = hlsRef.current
  if (hls && hls.subtitleTrack >= 0) {
    hls.subtitleTrack = -1  // Disable
  } else {
    selectSubtitleTrack(0)   // Enable first track
  }
}
```

### 4.2 Styling Subtitles

Add CSS for subtitle customization in [src/app/globals.css](src/app/globals.css):

```css
/* HLS.js subtitle styling */
video::cue {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-family: Arial, sans-serif;
  font-size: 1rem;  /* Medium size - user can adjust */
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 2px;
}

/* Size variants */
video.cc-small::cue {
  font-size: 0.875rem;
}

video.cc-large::cue {
  font-size: 1.25rem;
}

video.cc-xlarge::cue {
  font-size: 1.5rem;
}
```

---

## 5. UI Components

### 5.1 Add CC Button to Player Controls

Update [src/components/hls-player.tsx](src/components/hls-player.tsx) player UI section:

```tsx
{/* Subtitle/CC Controls */}
<div className="flex items-center gap-1">
  {availableSubtitles.length > 0 ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          title="Subtitles (C)"
        >
          <Type className={cn(
            'h-4 w-4',
            ccEnabled && 'text-primary'
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Subtitles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* CC Toggle */}
        <DropdownMenuItem
          onClick={() => toggleSubtitles()}
          className="flex items-center justify-between"
        >
          <span>Closed Captions</span>
          {ccEnabled && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        {ccEnabled && (
          <>
            <DropdownMenuSeparator />
            
            {/* Language Selection */}
            <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
            {availableSubtitles.map((track, idx) => (
              <DropdownMenuItem
                key={track.id}
                onClick={() => selectSubtitleTrack(idx)}
                className="flex items-center justify-between pl-8"
              >
                <span>{track.name || track.lang}</span>
                {currentSubtitle?.id === track.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            {/* Font Size */}
            <DropdownMenuLabel className="text-xs">Font Size</DropdownMenuLabel>
            {(['small', 'medium', 'large'] as const).map(size => (
              <DropdownMenuItem
                key={size}
                onClick={() => setCCFontSize(size)}
                className="flex items-center justify-between pl-8"
              >
                <span className="capitalize">{size}</span>
                {ccFontSize === size && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="h-10 w-10 p-0 opacity-50 cursor-not-allowed"
      title="No subtitles available"
      disabled
    >
      <Type className="h-4 w-4" />
    </Button>
  )}
</div>
```

### 5.2 Keyboard Shortcut

Add to keyboard handler in `hls-player.tsx`:

```typescript
case 'c':
  e.preventDefault()
  toggleSubtitles()
  showControlsTemporarily()
  break
```

---

## 6. Implementation Checklist

### Phase 1: Data Model (1-2 hours)
- [ ] Add `SubtitleTrack` interface to `src/types/index.ts`
- [ ] Update `Channel` interface with `subtitles?: SubtitleTrack[]`
- [ ] Add CC preferences to Zustand store
- [ ] Add localStorage persistence for CC settings
- [ ] Add `CC` icon import from lucide-react

### Phase 2: Parser Enhancement (1-2 hours)
- [ ] Implement `extractSubtitleTracks()` helper in `m3u-parser.ts`
- [ ] Implement `resolveUrl()` helper for relative URL resolution
- [ ] Integrate subtitle extraction into `parseM3U()`
- [ ] Test parser with sample M3U containing `#EXT-X-MEDIA` tags
- [ ] Handle edge cases (no subtitles, malformed tracks)

### Phase 3: Player Integration (2-3 hours)
- [ ] Update HLS.js config for subtitle support
- [ ] Add event handlers: `SUBTITLE_TRACKS_UPDATED`, `SUBTITLE_TRACK_SWITCH`
- [ ] Implement `selectSubtitleTrack()` and `toggleSubtitles()` methods
- [ ] Add subtitle styling CSS in `globals.css`
- [ ] Connect to store for preference persistence
- [ ] Test with real HLS streams that have subtitles

### Phase 4: UI Controls (1-2 hours)
- [ ] Add CC button to player controls bar
- [ ] Create dropdown menu with language options
- [ ] Add font size adjustment options
- [ ] Add keyboard shortcut (C key)
- [ ] Style dropdown to match player theme
- [ ] Test visibility when CC unavailable

### Phase 5: Testing & Polish (1 hour)
- [ ] Test with various subtitle formats (VTT, TTML, CEA-608)
- [ ] Test with multi-language streams
- [ ] Verify localStorage persistence works
- [ ] Test keyboard shortcuts
- [ ] Document for users in UI (tooltip, help text)

---

## 7. Testing Recommendations

### Test Streams
```
# These streams typically have subtitles
- Animation channels (usually have CC for accessibility)
- News channels (live news with captions)
- Kids channels (required by law in many countries)
- Foreign language streams (Spanish, Portuguese, etc.)

# Test URLs to try:
https://example.com/playlist.m3u8  # Contains #EXT-X-MEDIA with SUBTITLES
```

### Test Cases
1. Stream with single subtitle track → Should auto-enable
2. Stream with multiple languages → Language selection works
3. Stream without subtitles → CC button disabled gracefully
4. User preference persistence → Reload page, CC state preserved
5. Subtitle toggle → C key on keyboard works
6. Font size changes → Visual change in video element

---

## 8. Edge Cases to Handle

| Case | Handling |
|------|----------|
| No `#EXT-X-MEDIA` in manifest | Fallback: check for `#EXT-X-SUBTITLES` |
| Relative subtitle URLs | Resolve against base playlist URL |
| Missing subtitle file URL | Skip track gracefully, don't crash |
| User preference language unavailable | Default to first available track |
| HLS.js version too old | Feature degrades, CC button hidden |
| Subtitle download fails | Log error, remove track from list |

---

## 9. Future Enhancements

After initial implementation:

1. **Subtitle Format Support**
   - Auto-convert SRT/SUB to VTT
   - Handle TTML/DFXP formats
   - Support CEA-608 embedded captions

2. **Advanced Features**
   - Custom background/text colors
   - Outline/shadow options
   - Font family selection
   - Caption positioning (top/bottom/middle)

3. **Analytics**
   - Track which users enable CC
   - Most used languages
   - Popular subtitle tracks

4. **Content Metadata**
   - Indicate streams with CC availability in browse view
   - Filter "Has CC" option
   - Highlight Kids content with CC support

---

## 10. Files to Modify/Create

```
src/
  types/
    index.ts                      (UPDATE)
  lib/
    m3u-parser.ts                 (UPDATE)
  store/
    useStreamVaultStore.ts         (UPDATE)
  components/
    hls-player.tsx                (UPDATE)
  app/
    globals.css                   (UPDATE - add CSS)

Documentation:
  CLOSED_CAPTIONS_IMPLEMENTATION.md (THIS FILE)
```

---

## Success Criteria

✅ Users can:
- See CC availability in a visual indicator
- Enable/disable captions with CC button and C key
- Select subtitle language from dropdown
- Adjust font size for accessibility
- CC state persists across browser sessions

✅ System:
- Parses subtitle metadata from IPTV M3U sources
- Gracefully handles streams without subtitles
- No breaking changes to existing playback
- Performance impact negligible (<5ms per parse)

---

## References

- [HLS.js Subtitle Documentation](https://github.com/video-dev/hls.js/wiki#subtitle-tracks)
- [HTML5 TextTrack API](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack)
- [WebVTT Format](https://www.w3.org/TR/webvtt1/)
- [IPTV M3U Extension](https://github.com/iptv-org/iptv/blob/master/README.md#documentation)
- [HLS Specification (RFC 8216)](https://tools.ietf.org/html/rfc8216)

---

**Last Updated**: April 19, 2026
**Status**: Ready for implementation
