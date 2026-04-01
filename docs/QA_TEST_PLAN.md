# NodeBench Full QA Test Plan

## Test Matrix — 8 Categories, 47 Tests

### Category 1: Search & Chat (Core Product)
| # | Test | Input | Expected | Status |
|---|------|-------|----------|--------|
| 1.1 | Company search | "Anthropic" | Entity card with real data, >0% confidence | |
| 1.2 | Idea search | "AI tutoring app for college students" | Analysis with gaps, next steps | |
| 1.3 | Competitor compare | "Compare Stripe vs Square" | Multi-entity comparison | |
| 1.4 | VC readiness | "Am I ready to pitch Sequoia?" | Readiness scorecard | |
| 1.5 | Follow-up chip click | Click any follow-up chip | Second message appears in thread | |
| 1.6 | New conversation | Click "New conversation" | Chat clears, landing returns | |
| 1.7 | Full profile expand | Click "Full profile" on result | Company profile sections render | |
| 1.8 | Full profile collapse | Click X on profile | Returns to chat message | |
| 1.9 | Empty query submit | Press Enter with empty input | Nothing happens (no error) | |
| 1.10 | Very long query | 500+ character input | Truncates gracefully, search works | |
| 1.11 | Lens switching | Switch to Investor, search same | Different perspective in result | |
| 1.12 | Multiple searches | 3 queries in sequence | All 3 messages in thread | |

### Category 2: Navigation
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 2.1 | Sidebar → Ask | Click Ask | surface=ask, landing page | |
| 2.2 | Sidebar → Decisions | Click Decisions | surface=memo, Decision Workbench | |
| 2.3 | Sidebar → Research | Click Research | surface=research, Research Hub | |
| 2.4 | Sidebar → Docs | Click Docs | surface=editor, Workspace | |
| 2.5 | Sidebar → Dashboard | Click Dashboard | /founder, Dashboard tabs | |
| 2.6 | Sidebar → Coordination | Click Coordination | coordination hub | |
| 2.7 | Sidebar → Entities | Click Entities | entities page | |
| 2.8 | Round-trip nav | Ask→Decisions→Research→Ask | Each page renders, back to Ask clean | |
| 2.9 | Direct URL | Type /?surface=memo in browser | Decision Workbench renders | |
| 2.10 | Browser back/forward | Navigate 3 pages, press back twice | Correct page renders | |

### Category 3: Agent Panel (FAB)
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 3.1 | FAB visible | Load any page | Terracotta circle bottom-right | |
| 3.2 | FAB click opens panel | Click FAB | Slide-over panel with backdrop | |
| 3.3 | Panel has founder chips | Panel open | "Pitch readiness", "Weekly reset" chips | |
| 3.4 | Panel close via X | Click X button | Panel closes, FAB returns | |
| 3.5 | Panel close via backdrop | Click dark backdrop | Panel closes | |
| 3.6 | No duplicate panels | Open panel on any page | Only ONE panel visible | |

### Category 4: Decisions Page
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 4.1 | Renders content | Navigate to Decisions | "What should you decide?" hero visible | |
| 4.2 | Fixture selector | Change dropdown | Different fixture loads | |
| 4.3 | Tab switch | Click "Founder Strategy" tab | Different content renders | |
| 4.4 | Share button | Click Share | Share functionality (or placeholder) | |

### Category 5: Dashboard
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 5.1 | Overview tab | Load Dashboard | Signals feed, company card | |
| 5.2 | Strategy tab | Click Strategy | Strategy content renders | |
| 5.3 | Intake tab | Click Intake | Intake form renders | |
| 5.4 | History tab | Click History | History content renders | |
| 5.5 | Changes tab | Click Changes | Changes content renders | |
| 5.6 | Delta tab | Click Delta | Delta content renders | |
| 5.7 | Export tab | Click Export | Export options render | |

### Category 6: Entities Page
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 6.1 | List view | Load Entities | "Your Company" card visible | |
| 6.2 | Graph view | Click Graph toggle | SVG graph with center node | |
| 6.3 | Add entity form | Click "+ Add Entity" | Form appears | |
| 6.4 | Toggle back to list | Click List toggle | List view returns | |

### Category 7: Coordination Hub
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 7.1 | Hub tab | Load Coordination | Peers, Tasks, Messages sections | |
| 7.2 | Team tab | Click Team | Team view renders | |
| 7.3 | Command tab | Click Command | Command panel renders | |
| 7.4 | Agents tab | Click Agents | Agents view renders | |

### Category 8: Cross-Cutting
| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 8.1 | Console errors | Check all pages | 0 errors | |
| 8.2 | Mobile (375px) | Resize to 375px | No horizontal overflow | |
| 8.3 | Onboarding wizard | Clear localStorage, reload | 3-step wizard shows | |
| 8.4 | Search bar Cmd+K | Press Cmd+K or Ctrl+K | Command palette opens | |
