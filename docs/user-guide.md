# User Guide - Conclusion Tech Radar

Welcome to the Conclusion Tech Radar! This guide provides a comprehensive overview of how to interact with the radar, understand its concepts, and contribute your own evaluations.

---

## 1. Introduction to the Tech Radar
The Conclusion Tech Radar is a visualization tool used to track technology trends and their maturity within our organization. It provides a shared language for teams to discuss technologies, frameworks, and tools.

The radar is divided into **Segments** (what it is) and **Rings** (where it stands).

### Categories (Segments / Quadrants)
The radar is divided into five functional sectors:
- **Platform**: Foundational tools and services for building and operating systems (e.g., Cloud Platforms, Kubernetes).
- **Infrastructure**: Hardware, networks, and low-level services (e.g., VPNs, Servers).
- **Process**: Working methodologies, practices, and techniques (e.g., Agile, DevOps).
- **Tools**: Developer tools, frameworks, and libraries (e.g., VS Code, React).
- **Data**: Technologies for storage, processing, and analysis (e.g., SQL, Spark).

### Adoption Phases (The Rings)
The distance from the center represents a technology's maturity and suggested usage:
- **Adopt (Inner Ring)**: Production-ready. We strongly recommend these for most projects.
- **Trial**: Worth using on a project that can handle a bit more risk. Ready for evaluation.
- **Assess**: High potential, but needs more exploration to understand how it fits.
- **Hold (Outer Ring)**: Proceed with caution. New projects should generally avoid these.
- **Deprecate**: Technologies we are phasing out. Do not use for new work.

---

## 2. Understanding Blips and Symbols

Every technology on the radar is represented by a **Blip**.

### Shapes and Domains
In the main **Companies Radar**, the shape of a blip tells you which **Domain** the rating comes from:
- ■ **Square**: Cloud & Mission Critical
- ▲ **Triangle**: Business Consultancy
- ◆ **Diamond**: Experience, Development & Software
- ★ **Star**: Data & AI
- ● **Circle**: Enterprise Applications / Other

### Company Colors
Each company is assigned a unique color. This color is consistent across the radar blips and the legend, helping you track a single company's evaluations at a glance.

---

## 3. Navigation and Interaction

### Interacting with Blips
- **Hover**: Hover over a blip to see the technology name, the company that rated it, and the ring it resides in.
- **Click**: Click a blip to open the **Technology Details Modal**.
    - View the full description and evaluation.
    - See tags associated with the technology.
    - Find links to official documentation or vendor pages.
    - View "Other Evaluations" for the same technology from different companies.

### Drilling Down
- **Double-click Categories**: Double-click a category name (e.g., "Platform") in the radar sector to focus entirely on that segment.
- **Double-click Phases**: Double-click a ring name (e.g., "Adopt") to see only technologies in that phase across all categories.

### The Company Legend (Right Sidebar)
The legend lists all companies currently visible on the radar.
- **Sorted by Impact**: Companies with the most blips are listed at the top.
- **Hover to Highlight**: Hover over a company name in the legend to light up all its blips on the radar while dimming others.
- **Single-Click**: Open the **Company Profile Modal**, showing the company's domain, description, and a breakdown of their technology ratings.
- **Double-Click**: Filter the entire radar to show *only* that company's ratings.

---

## 4. Search and Filtering

The left sidebar gives you full control over the data:

- **Search Box**: Instantly find a technology by its name.
- **Reset Filters**: One-click button to clear all active filters and return to the default view.
- **Tag Cloud**: Filter by specific technical tags (e.g., "java", "security").
- **Date Filter**: Filter for "Show ratings after [Date]" to see fresh evaluations.
- **Visibility Toggles**:
    - **Show/Hide Rings/Segments**: Declutter the view by hiding the background grid.
    - **Show Logos on Blips**: Replace shapes with technology logos for faster recognition.

---

## 5. Individual Radar (Colleagues Radar)

Switch to the **Individual Radar** tab (top navigation) to see personal ratings from colleagues within the company. This view is focused on individual skillsets and interests rather than corporate adoption.

**Phases in Individual Mode:**
- **Pre-assess**: "I'm curious about this and want to learn more."
- **Personal Assess**: "I am currently experimenting with this."
- **Personal Use**: "I use this regularly in my toolset."
- **Hold**: "I've stopped using this or decided it's not for me."

---

## 6. How to Add Your Own Entries

The radar is a collaborative tool. You can manage your own ratings locally in your browser.

### The "Manage Ratings" Tab
1. Sign in (if required) to unlock the **Manage Ratings** tab.
2. **Add a Rating**: Click **+ Add Rating**.
    - If you specify a **Company**, it becomes a company rating.
    - If you leave the company field empty, it becomes an **Individual** rating.
3. **Rich Text Support**: The comment field supports **Markdown**. You can add links, bullet points, and headings to make your evaluation more readable.
4. **Manage Technologies**: If a technology isn't in our database yet, click the **+** button next to the name field to define its category and metadata.

### Data Privacy and Export
- **Local Storage**: Your ratings are saved *only in your browser* (Local Storage).
- **Exporting (Download JSON)**: Click **Download JSON** to save a file of your ratings. You can share this file with administrators to have your ratings officially included in the main radar.
- **Clear All**: If you want to start fresh, you can delete all your local ratings at any time.

---

## 7. Advanced Features
- **Radar Optimization**: Click the **Optimize** button in the sidebar. This uses a polar grid layout to ensure blips don't overlap and hides empty sectors to save space.
- **Company Modal Double-Click**: You can also double-click company tags in the sidebar to open their profile directly.
- **Authentication**: Using Microsoft Entra ID (Sign in button), you can see your profile name and potentially sync data in the future.
