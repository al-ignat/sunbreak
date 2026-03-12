# Grammarly-Style Widget Model for Sunbreak

## Goal

Define a widget model for `sunbreak` that borrows the durable parts of Grammarly's approach without copying product behavior or adding unnecessary platform complexity.

This model is based on:

- the current `sunbreak` implementation
- inspection of Grammarly's shipped Chrome extension package
- the assumption that supported AI tools will keep changing their DOM frequently

## Core Principle

Treat the widget as an attachment to a live editor instance, not as a floating icon.

That changes the design in an important way:

- the editor is the primary object
- the widget is a view attached to that editor
- the anchor is only one output of the attachment system

## What Sunbreak Has Today

Current strengths:

- adapters already exist per host
- the widget is isolated in a closed shadow root
- the widget can anchor to the send button or fall back to the input box
- observation and re-attachment logic already exist

Current weakness:

- editor discovery, UI mounting, anchor selection, and failure handling are still fairly centralized
- adapters do not yet declare what they are capable of
- the system still acts like supported editors are variations of one shared model

That is acceptable for three hosts, but it will get brittle if the host behavior diverges.

## Proposed Model

The widget system should be organized around four layers:

1. editor attachment lifecycle
2. anchor strategy selection
3. fallback behavior
4. failure recovery behavior

## 1. Editor Attachment Lifecycle

### Plain-English model

For each supported page, `sunbreak` should repeatedly answer four questions:

1. Is there an editor here?
2. Is it the editor we should attach to?
3. Is it still alive?
4. Can we still safely act on it?

### Lifecycle states

Each editor instance should conceptually move through these states:

- `searching`
- `attached`
- `observing`
- `degraded`
- `detached`

### What each state means

`searching`

- no usable editor is available yet
- keep watching for one to appear

`attached`

- an editor was found
- the widget is mounted against this editor instance
- site-specific capabilities are checked

`observing`

- normal operating mode
- track text, send button presence, size changes, and page navigation

`degraded`

- the editor still exists, but one important capability is unreliable
- examples:
  - send button cannot be located
  - text can be read but not safely written back
  - host container is unstable

`detached`

- editor was removed, replaced, or became invalid
- widget should unmount and return to `searching`

### Recommended ownership

Split ownership like this:

- adapter:
  - knows how to find editor-specific elements
  - knows host capabilities
  - knows when the host is in a degraded state
- observer/lifecycle manager:
  - owns state transitions
  - owns re-attachment
  - owns diagnostics
- widget controller:
  - only renders and positions UI for the active editor instance

This is the main structural shift.

## 2. Anchor Strategy Selection

### Plain-English model

The widget should choose the best available anchor in ranked order instead of assuming one anchor always works.

### Recommended anchor priority

1. send button anchor
2. composer action area anchor
3. input box edge anchor
4. host-specific custom anchor
5. hidden/deferred state

### Anchor types

`send button anchor`

- best when a stable send button exists
- visually feels attached to the actual submit action
- best for ChatGPT/Claude/Gemini when available

`composer action area anchor`

- use the action button cluster area if the exact send button changes too often
- still feels attached to the composer controls
- more resilient than exact-button anchoring

`input box edge anchor`

- use the editor bounds when no reliable action button exists
- safer fallback
- lower precision, but higher stability

`host-specific custom anchor`

- for sites where the editor behaves unusually
- examples:
  - shadow-root internals
  - unstable button trees
  - moving accessory bars

`hidden/deferred state`

- if there is no trustworthy place to anchor, do not guess
- wait until a reliable anchor becomes available

### Anchor decision rule

At runtime:

- prefer the most specific stable anchor
- downgrade immediately when it disappears
- upgrade back when a better anchor becomes reliable again

That means the widget can move between anchor modes without treating it as an error.

## 3. Fallback Rules

### Plain-English model

Fallbacks should be deliberate, not accidental.

Right now, `sunbreak` already has a good start:

- try send button
- fall back to input box

That should be expanded into an explicit policy.

### Recommended fallback policy

If the send button cannot be found:

- fall back to composer action area if available
- otherwise fall back to input box edge

If the editor exists but is not visually measurable:

- keep the widget hidden
- retry on resize, mutation, or next animation frame

If the widget would render off-screen or overlap badly:

- clamp to viewport
- if still poor, choose a simpler fallback anchor

If text can be read but not safely written back:

- continue with warning and logging behavior
- disable masking/rewrite actions for that host state

If multiple candidate editors exist:

- attach only to the active one
- active should usually mean focused or closest to the visible action controls

### Product rule

When in doubt, degrade gracefully instead of acting clever.

That is one of the strongest lessons from Grammarly-like products. A stable, modest widget is better than a smart widget that attaches to the wrong thing.

## 4. Failure Recovery Behavior

### Plain-English model

Failures should be expected. The system should recover without making the user feel the extension is broken.

### Failure classes

`attach failure`

- no valid editor found within timeout

`anchor failure`

- editor found, but no trustworthy anchor available

`write-back failure`

- editor text cannot be safely replaced

`stale reference`

- saved editor element was removed or replaced

`navigation replacement`

- SPA route changed and the old editor is no longer valid

### Recovery rules

For attach failure:

- log locally
- stay in `searching`
- retry on DOM change or route change

For anchor failure:

- hide the widget or use a lower-confidence fallback anchor
- do not block core detection logic

For write-back failure:

- preserve detection
- disable rewrite actions for the current editor instance
- expose a softer user path like copy-redacted text if needed later

For stale reference:

- immediately unmount
- clear any anchor measurements
- restart editor search

For navigation replacement:

- clear editor-bound state
- keep durable extension state
- re-run attachment flow

## Capability Flags to Support This Model

Adapters should declare capabilities directly instead of forcing the central runtime to infer everything.

Suggested capabilities:

- `supportsSendButtonAnchor`
- `supportsComposerActionAnchor`
- `supportsInputBoxAnchor`
- `supportsReliableSetText`
- `requiresPageContextBridge`
- `supportsOverlay`
- `supportsFileDetection`
- `prefersEarlyInjection`

This is the cleanest next step because it lets behavior branch in a controlled way.

## Suggested Host Profiles

These are not permanent truths. They are starting assumptions.

### ChatGPT

Likely profile:

- supports send button anchor
- supports input box anchor
- may need resilient composer-action fallback because button variants change
- text write-back should be treated as somewhat risky until proven stable

### Claude

Likely profile:

- supports send button anchor
- supports input box anchor
- usually simpler control area than ChatGPT
- still vulnerable to composer DOM reshuffles

### Gemini

Likely profile:

- supports send button anchor when visible
- should keep stronger fallback behavior because Google frequently changes nested structures
- may become the first host needing a more custom anchor strategy

## Diagnostics Model

To make the system maintainable, log local diagnostics for:

- attach attempt count by host
- attach failure count by host
- current anchor mode
- anchor downgrade count
- re-attachment count
- write-back failure count
- time spent waiting for the first valid editor

This should be developer-facing first. You need evidence before you add complexity.

## UI Behavior Rules

### When to show the widget

Show the widget only when at least one of these is true:

- active findings exist
- masking state exists
- the user is in an active intervention flow
- a restore/send decision is pending

This matches the "helpful, not noisy" model.

### When to hide the widget

Hide the widget when:

- no active editor is attached
- the current editor is unstable and no safe fallback anchor exists
- there is no meaningful action for the user

## Recommended Implementation Order

### Step 1

Add adapter capability flags in the adapter type and host adapter implementations.

### Step 2

Introduce an explicit anchor mode selector:

- `send-button`
- `composer-actions`
- `input-box`
- `custom`
- `hidden`

### Step 3

Move attach/degrade/detach state handling into a small lifecycle manager separate from the widget controller.

### Step 4

Add local diagnostics for attach, anchor, and write-back failures.

### Step 5

Only after evidence appears, introduce host-specific custom anchor behavior for the host that actually needs it.

## Product Interpretation of Grammarly's Lesson

The right lesson from Grammarly is:

- not "inject more UI"
- not "support every site"
- not "copy their widget look"

The real lesson is:

- make the editor attachment model explicit
- make anchor choice dynamic
- treat weird hosts as normal engineering cases
- fail quietly and recover fast

That is the version that fits `sunbreak`.
