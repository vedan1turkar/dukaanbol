# DukaanBol: Context, Build Spec and Impact Case

Use this file as the full brief for building the prototype. Sections 1 to 3 are for the builder. Section 4 is the impact case.

---

## 1. Context

India has an estimated 12 million kirana stores, and most are owner-operated. Owners usually track stock from memory, handwritten registers and shelf checks. They often buy from several distributors on limited working capital. Shortages and expired stock are usually noticed late, and reordering is mostly guesswork. Most inventory software is English-heavy and screen-based, which does not suit a busy counter.

DukaanBol is a voice-first inventory and procurement assistant for these stores. The shopkeeper speaks naturally to record sales and stock arrivals, check stock and expiry, and get reorder recommendations. The system can also prepare a purchase order within the owner's budget. The owner must approve it. Nothing is ordered automatically.

The first pilot covers Maharashtra kirana stores in Marathi, Hindi and Hinglish. Other languages and accents are not claimed until they are tested.

The central challenge is trust. Speech recognition in a noisy shop with regional accents and mixed languages will make mistakes. The design therefore uses confirm-before-save, undo, a transaction history and manual fallback, so a misheard word never silently changes inventory.

---

## 2. Build Prompt

Build a working prototype of **DukaanBol**, a voice-first, AI-powered inventory management and agentic procurement assistant for small kirana stores in India. Voice is the primary interaction method, not a feature added to a conventional dashboard.

### 2.1 Users and languages

- Small, owner-operated kirana stores, often with one or two helpers.
- Users track stock today through memory, shelf checks or handwritten registers.
- Users may not be comfortable with complicated or English-heavy software.
- Users buy from multiple distributors with limited working capital.

Maharashtra pilot languages: Marathi, Hindi, Hinglish, and English brand and product names inside Marathi or Hindi sentences. Account for regional accents, speaking speeds, informal vocabulary and code-switching. Let users choose their preferred language. Do not claim support for other languages or accents until tested.

### 2.2 Voice interaction

- Push-to-talk microphone as the primary input. Never listen continuously.
- Main screen has: a prominent mic button, a visible recording indicator, a live or final transcript, a confirmation area, a compact inventory summary, and a manual-entry fallback.
- The system speaks short, natural replies and shows the same key information on screen.

### 2.3 Voice flows

**A. Record a sale**
User: "आज 10 Parle-G चे packets विकले."
System: transcribes, detects sale intent, extracts product (Parle-G) and quantity (10 packets), matches the catalogue, checks stock.
Reply: "10 Parle-G packets विकले, बरोबर?"
Screen: Sale, Parle-G, 10 packets. Buttons: Confirm, Edit, Cancel.
After confirm: "ठीक आहे. Parle-G चा stock update केला." The ledger is updated.

**B. Record new stock**
User: "आज distributor कडून 24 Maggi packets आले."
Extract: stock received, Maggi, 24 packets, supplier if identifiable.
Reply: "24 Maggi packets stock मध्ये add करू?" After confirm, update inventory.
If expiry applies, ask: "या batch ची expiry date काय आहे?" The date can be spoken or picked manually. Never invent an expiry date.

**C. Check inventory** (read-only, no confirmation)
User: "Maggi चा किती stock बाकी आहे?"
Reply: "तुमच्याकडे सध्या 18 Maggi packets आहेत."
Screen: product, quantity, low-stock status, recent movement.

**D. Expiry risks**
User: "कोणते products expire होणार आहेत?"
Reply: "तुमच्या दुकानात 12 Parle-G packets ची expiry पुढच्या 7 दिवसांत आहे."
Screen: affected products, quantities, dates. May suggest selling these first or checking return options.

**E. Reorder recommendations**
User: "मला कोणते products order करायला पाहिजेत?"
Analyse current stock, recent sales, fast movers, reorder thresholds, incoming stock, supplier lead times (if known) and budget.
Reply: "Maggi आणि Parle-G चा stock कमी होत आहे. मी purchase recommendations तयार करू का?"
Screen: product, current stock, suggested quantity, estimated cost, supplier, reason.

**F. Agentic procurement**
User: "माझा आजचा purchasing budget 3000 रुपये आहे."
The agent then: stores the budget, finds products needing replenishment, calculates quantities, fetches supplier prices where known, prioritises by urgency and owner-set importance, checks total cost against budget, and prepares a supplier-wise purchase order.
If over budget, suggest a reduced order and show deferred items.
Reply: "तुमच्या 3000 रुपयांच्या budget मध्ये हा order तयार केला आहे. Approve करायचा का?"
Screen: products, quantities, supplier, estimated total, remaining budget.
The owner must approve explicitly. Never send or place an order automatically. In the prototype, approval saves the purchase order as an approved record. Do not pretend a distributor received it.

### 2.4 Error handling and recovery

- **Background noise:** Detect failed or incomplete input. Do not guess. Ask to repeat and offer manual entry. "आवाज नीट ऐकू आला नाही. कृपया पुन्हा बोला."
- **Accents and pronunciation:** Match local aliases and common variants. Show the matched product for confirmation. If several products match, ask the user to choose. Never silently pick an uncertain product.
- **Mixed language:** Handle sentences like "आज 5 packets Maggi चे add करा" and extract intent, product and quantity.
- **Misheard quantity:** If unsure between, for example, 15 and 50, do not update. Ask "तुम्ही 15 packets म्हणालात की 50?" and show both choices.
- **Unknown product:** Ask "हा product inventory मध्ये सापडला नाही. नवीन product add करायचा आहे का?" Allow manual creation (name, unit, optional category, opening quantity, optional cost and selling price). Never auto-create duplicates.
- **Missing information:** Ask one question at a time. For "नवीन stock आला आहे", ask "कोणता product आला?" then "किती quantity आली?"
- **Incorrect updates:** Offer immediate undo after every confirmed change. Support "Cancel करा", "मागचा update undo करा" and "Quantity बदलायची आहे". Corrections never erase the original record.

### 2.5 Confidence and confirmation rules

- High confidence: show the transaction for confirmation.
- Medium confidence: ask a targeted clarification.
- Low confidence: ask to repeat or use manual entry.
- Unknown product: ask the user to identify or add it.
- Ambiguous quantity or unit: never update until clarified.

Make thresholds configurable settings. Do not assume scores from different speech engines are comparable. Every inventory-changing transaction must be confirmed before saving. Read-only questions are answered immediately.

### 2.6 Screens

1. Onboarding: shop name, language, purchasing budget, basic inventory setup.
2. Voice Home (primary entry point): large mic, recent activity, stock alerts.
3. Inventory: product list, quantity, category, expiry, status.
4. Product Details: stock movements, batches, sales history, supplier info.
5. Alerts: low stock, expiry risks, slow-moving items.
6. Procurement: recommendations, reorder quantities, supplier-wise order, budget calculation.
7. Approval: final purchase order review and owner approval.
8. History: sales, arrivals, corrections, approved purchase orders.

### 2.7 Data and logic

Each product has: unique ID, name, local aliases, unit, current quantity, minimum stock threshold, cost price (if known), selling price (if known), supplier details (if known), batch number and expiry date (where available).

- Keep a ledger for sales, arrivals, damaged goods and corrections.
- Never allow silent negative stock. Flag insufficient quantity and ask the user to clarify.
- Demand estimation: use sales history where available. Start with configurable reorder thresholds when history is thin. Show when a recommendation rests on limited data. Do not claim accurate festival forecasting without relevant data.
- All stock, quantity, budget and purchase calculations run in deterministic backend code. Use the AI model only for language understanding and workflow orchestration.

### 2.8 Prototype scope

**Must work:**
- Marathi, Hindi and Hinglish voice interaction
- Voice sales recording and stock arrival recording
- Product matching and quantity confirmation
- Inventory updates
- Low-stock identification
- Expiry alerts from entered expiry data
- Basic reorder recommendations
- Budget checks
- Purchase order preparation and owner approval
- Manual fallback and transaction correction

**Later (do not simulate as working):**
- Distributor invoice scanning
- Advanced festival forecasting
- Automatic distributor integrations
- Joint purchases with neighbouring shops
- Advanced supplier price comparison
- Digital payment and customer credit integration

### 2.9 Definition of done

The prototype must demonstrate one complete journey. The shopkeeper records a sale by voice. DukaanBol understands the language, extracts product and quantity, confirms, and updates inventory. It then detects an upcoming shortage, prepares a budget-aware reorder recommendation and asks the owner to approve the purchase.

Use realistic sample products such as Parle-G, Maggi, Amul Milk and Tata Salt. The interface must be simple enough for a shopkeeper with limited technical experience.

### 2.10 What builders must not get wrong

1. **Voice-first:** the mic and conversation are the main way to use the product.
2. **Reliable transactions:** a misheard quantity or product must never silently corrupt inventory.
3. **Real agentic workflow:** go from understanding the request to analysing inventory and preparing a budget-compliant purchase order for owner approval.

A prototype that only converts speech to text and shows a chatbot is not sufficient.

---

## 3. Suggested build order

1. Data model and ledger (products, aliases, batches, transactions, undo).
2. Deterministic logic (stock, reorder, budget checks) with tests.
3. Voice input, transcript, and intent and entity extraction.
4. Product matching, confidence rules and confirmation UI.
5. Error flows (noise, ambiguity, unknown product, missing info).
6. Alerts and procurement agent with budget handling.
7. Approval screen and history.
8. Language selection and Marathi, Hindi and Hinglish test phrases.

---

## 4. Impact Case (50 to 500 words)

Write an impact case for DukaanBol under these four headings. Label all numbers as assumptions.

**Who benefits.** Owner-operated kirana shopkeepers and their helpers. A pilot of 50 to 100 Maharashtra stores changes the working day of roughly 100 to 300 people. India has an estimated 12 million kirana stores overall. Customers benefit indirectly through better-stocked shelves.

**What changes.** Today: stock lives in memory, registers and shelf checks. Shortages and expiry are found late, and reordering is guesswork. With DukaanBol: sales and arrivals are recorded by voice in Marathi, Hindi or Hinglish. Every update is confirmed and can be undone. The system flags low stock and expiry risks, and prepares a budget-checked purchase order that the owner approves. Nothing is ordered automatically.

**How we'd know it worked.** Measured over an 8-week pilot against a baseline from a one-week manual stock count and a short owner interview:
- Adoption: at least 60% of shops record 5 or more voice transactions on 5 or more days a week by week 4.
- Accuracy: at least 90% of voice transactions confirmed without edits, and fewer than 2% corrected later.
- Business outcome: 25% fewer stockouts on tracked fast-moving items and 20% less expired stock.
- Trust: at least 70% of recommended orders approved, in full or with edits.

**The main risk.** Speech recognition errors in noisy shops, with regional accents and mixed languages, could cost shopkeepers' trust and send them back to memory and registers. Confirmation, undo and manual fallback reduce this risk but do not remove it, and too many confirmations could slow users down. Other limits: new users have no sales history, so early recommendations use simple thresholds. Only three languages are in scope, and there is no real distributor integration.
