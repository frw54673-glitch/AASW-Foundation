# Team Portrait Crop Audit

Source reviewed: user-provided 1430×8731 preview screenshot, sliced into nine vertically ordered overlapping crops on 18 August 2026.

## Verified first-pass findings

The Team page shell and category hierarchy render correctly. In the Leadership group, the former fixed `object-fit: cover` treatment crops the Patron and founder portrait areas too aggressively: faces are only partially visible in the card frames. The correction will use member-specific framing metadata and a portrait-safe crop container so the official photo remains intact and facial framing is prioritised without inventing or altering any source imagery.

The next two ordered screenshot crops confirm that **Anupam Trivedi** and **Aparna Mishra** are cropped at the forehead/eye line in the existing fixed-height leadership cards. The reviewed first Central Advisory row, however, keeps faces fully visible. The fix will therefore apply face-safe crop metadata to leadership portraits and retain a dignified, consistent card ratio for the advisory grid rather than applying one unsafe global crop to every photo.

The remaining Central Advisory cards and all Digital Trainer cards keep their faces visible in the supplied screenshot. Their layout will receive the same refined card surface and hover/focus interactions, but no additional crop override is necessary for these source portraits.

The State Council area correctly uses source-unavailable editorial placeholders rather than invented photos. It is not part of the portrait crop fix; its name-only cards will retain this truthful treatment.

The final ordered crop confirms the Team page’s closing invitation and footer are unaffected by the portrait issue. All nine screenshot tiles were reviewed in order with overlap reconciliation; the actionable crop fault is isolated to Leadership image framing.

## Post-fix QA

The updated Team page was reviewed at 1280×900 and 375×812. The affected leadership portraits now use an uncropped, contained face-safe frame: the founder and co-founder faces remain visible instead of being cut at the forehead or eyes. Advisory and trainer portraits retain their existing clear source framing. The updated card surface provides visible hover and keyboard-focus feedback, while reduced-motion preferences disable nonessential transitions.

## Patron portrait treatment

The official Patron source asset is a 133×184 JPEG. It is retained at its native display dimensions rather than being enlarged and softened. The Patron card now supplies the same official asset as a centred background fallback beneath the native image element, ensuring the portrait remains visible while preserving the accessible image alt text and verified source mapping.

The managed Patron asset was directly verified in the preview origin, and the live Team page continues to expose it as the Patron card's accessible image source. The original portrait is therefore delivered from the approved source rather than replaced with an invented or altered image.

## Patron-to-Founder alignment QA

The Patron portrait now uses a larger 208×288 face-forward frame, aligned to the same visual scale as the Founder card. The green background panel and centred border sit around the frame rather than competing with it. Desktop and mobile Team captures confirm that the Patron face remains visible within the larger framed treatment.

## Clean background QA

The green Patron card panel has been removed while retaining the same larger 208×288 official photo frame. Desktop and mobile captures confirm that the framed portrait remains clearly visible over a warm neutral background without a green field behind it.
