<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat Panel Context Redesign - All File Types</title>
    <style>
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f5;
            --bg-tertiary: #fafafa;
            --bg-hover: #f0f0f0;
            --text-primary: #1a1a1a;
            --text-secondary: #666666;
            --text-muted: #999999;
            --border-color: #e5e5e5;
            --accent-primary: #3b82f6;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
        }

        .context-panel {
            max-width: 700px;
            margin: 0 auto;
        }

        /* Main container styling */
        .context-container {
            margin-bottom: 24px;
            padding: 12px;
            background: rgba(245, 245, 245, 0.3);
            border-radius: 8px;
            border: 1px solid rgba(229, 229, 229, 0.5);
        }

        /* Group button styling */
        .group-button {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 6px 8px;
            font-size: 12px;
            font-weight: 500;
            border-radius: 6px;
            transition: background-color 0.2s;
            color: var(--text-primary);
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            margin-bottom: 8px;
            cursor: pointer;
            position: relative;
        }

        .group-button:hover {
            background: var(--bg-hover);
        }

        /* Icons */
        .icon {
            width: 12px;
            height: 12px;
            flex-shrink: 0;
        }

        .chevron {
            transition: transform 0.2s;
        }

        .chevron.rotated {
            transform: rotate(-90deg);
        }

        /* Count badge */
        .count-badge {
            margin-left: auto;
            background: var(--bg-hover);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            color: var(--text-secondary);
        }

        /* Rename button */
        .rename-button {
            opacity: 0;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
            margin-left: 4px;
            background: transparent;
            border: none;
            cursor: pointer;
        }

        .group-button:hover .rename-button {
            opacity: 1;
        }

        .rename-button:hover {
            background: rgba(59, 130, 246, 0.1);
        }

        .rename-button svg {
            width: 12px;
            height: 12px;
            color: #3b82f6;
        }

        /* Content area */
        .group-content {
            margin-left: 16px;
        }

        /* Document list */
        .document-list {
            margin-left: 16px;
            padding-left: 8px;
            border-left: 1px solid var(--border-color);
            position: relative;
        }

        /* Document card */
        .document-wrapper {
            position: relative;
            margin-bottom: 8px;
        }

        .document-connector {
            position: absolute;
            left: -8px;
            top: 50%;
            width: 8px;
            height: 1px;
            background: var(--border-color);
        }

        .document-card {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
            white-space: nowrap;
            cursor: pointer;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            position: relative;
        }

        .document-card:hover {
            background: var(--bg-hover);
            cursor: grab;
        }

        .document-card:active {
            cursor: grabbing;
        }

        .document-name {
            flex: 1;
            margin-right: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
        }

        .document-time {
            font-size: 10px;
            color: var(--text-muted);
            flex-shrink: 0;
            margin-right: 4px;
        }

        /* Action buttons */
        .action-button {
            opacity: 0;
            padding: 2px;
            border-radius: 4px;
            transition: all 0.2s;
            flex-shrink: 0;
            margin-right: 4px;
            background: transparent;
            border: none;
            cursor: pointer;
        }

        .document-card:hover .action-button {
            opacity: 1;
        }

        .edit-button:hover {
            background: rgba(59, 130, 246, 0.1);
        }

        .delete-button:hover {
            background: rgba(239, 68, 68, 0.1);
        }

        .edit-button svg {
            color: currentColor;
        }

        .edit-button:hover svg {
            color: var(--accent-primary);
        }

        .delete-button svg {
            color: currentColor;
        }

        .delete-button:hover svg {
            color: #ef4444;
        }

        /* File type specific colors */
        .icon-file {
            color: #666666;
        }

        .icon-csv {
            color: #10b981;
        }

        .icon-excel {
            color: #059669;
        }

        .icon-pdf {
            color: #dc2626;
        }

        .icon-image {
            color: #3b82f6;
        }

        .icon-json {
            color: #f59e0b;
        }

        .icon-code {
            color: #8b5cf6;
        }

        .icon-text {
            color: #6b7280;
        }

        /* File section styling */
        .file-section {
            margin-top: 16px;
        }

        .file-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            transition: all 0.2s;
            cursor: pointer;
            margin-right: 4px;
            margin-bottom: 4px;
        }

        .file-badge:hover {
            border-color: var(--accent-primary);
        }

        .file-icon {
            font-size: 12px;
        }

        /* Flat context section styles */
        .flat-doc-button {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            transition: all 0.2s;
            cursor: pointer;
            margin-bottom: 4px;
        }

        .flat-doc-button:hover {
            border-color: var(--accent-primary);
        }

        .flat-file-button {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            transition: all 0.2s;
            cursor: pointer;
            margin-bottom: 4px;
        }

        .flat-file-button:hover {
            border-color: var(--accent-primary);
        }
    </style>
</head>
<body>
    <div class="context-panel">
        <h2 style="margin-bottom: 10px;">AI Chat Panel Context - All File Type Icons</h2>
        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 24px;">
            Complete design showing all file type icons and categorization for both flat and hierarchical views.
        </p>
        
        <!-- Original Flat Context Section -->
        <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--text-secondary);">Flat Context View (Original AI Chat Panel)</h3>
        <div class="flat-context-section" style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <button style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-radius: 4px; transition: all 0.2s; cursor: pointer;" 
                        onmouseover="this.style.color='var(--text-primary)'; this.style.background='var(--bg-hover)';"
                        onmouseout="this.style.color='var(--text-secondary)'; this.style.background='none';">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                    Context
                </button>
            </div>
            
            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border-color);">
                <!-- Docs section -->
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Docs</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        <button class="flat-doc-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                                <path d="M10 9H8"></path>
                                <path d="M16 13H8"></path>
                                <path d="M16 17H8"></path>
                            </svg>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">VCs attending Seattle event</span>
                        </button>
                        <button class="flat-doc-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="15" y1="3" x2="15" y2="21"></line>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="3" y1="15" x2="21" y2="15"></line>
                            </svg>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">AMO_Seller_Insights.csv</span>
                        </button>
                        <button class="flat-doc-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #dc2626;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-6-5z"/>
                                <path d="M14 2v5h5"/>
                                <path d="M9 13h6"/>
                                <path d="M9 17h3"/>
                            </svg>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">Investment_Report.pdf</span>
                        </button>
                        <button class="flat-doc-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #059669;">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <rect x="7" y="7" width="3" height="9"></rect>
                                <rect x="14" y="7" width="3" height="5"></rect>
                            </svg>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">Q3_Financials.xlsx</span>
                        </button>
                        <button class="flat-doc-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f59e0b;">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                <polyline points="13 2 13 9 20 9"/>
                                <path d="M12 12h.01"/>
                                <path d="M12 17h.01"/>
                            </svg>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">api_response.json</span>
                        </button>
                        <button class="flat-doc-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">product_mockup.png</span>
                        </button>
                    </div>
                </div>
                
                <!-- Files section -->
                <div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Files</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        <button class="flat-file-button">
                            <span style="font-size: 12px;">📊</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">AMO_Seller_Insights.csv</span>
                        </button>
                        <button class="flat-file-button">
                            <span style="font-size: 12px;">📈</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">Q3_Financials.xlsx</span>
                        </button>
                        <button class="flat-file-button">
                            <span style="font-size: 12px;">📄</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">Investment_Report.pdf</span>
                        </button>
                        <button class="flat-file-button">
                            <span style="font-size: 12px;">🖼️</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">product_mockup.png</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 24px 0;">
        
        <!-- Nested Hierarchy Context Section -->
        <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--text-secondary);">Nested Hierarchy View (Enhanced)</h3>
        <div class="context-container">
            <!-- Main expandable group -->
            <button class="group-button">
                <svg class="icon chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m6 9 6 6 6-6"></path>
                </svg>
                <svg class="icon icon-file" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <path d="M10 9H8"></path>
                    <path d="M16 13H8"></path>
                    <path d="M16 17H8"></path>
                </svg>
                <span style="flex: 1; text-align: left;">Context Documents</span>
                <span class="count-badge">15</span>
                <button class="rename-button" title="Rename section">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
                    </svg>
                </button>
            </button>

            <div class="group-content">
                <!-- Documents sub-group -->
                <button class="group-button">
                    <svg class="icon chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                    <svg class="icon icon-file" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #666666;">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                        <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                        <path d="M10 9H8"></path>
                        <path d="M16 13H8"></path>
                        <path d="M16 17H8"></path>
                    </svg>
                    <span>Documents</span>
                    <span class="count-badge">7</span>
                </button>

                <div class="document-list">
                    <!-- Document items -->
                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-file" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                                <path d="M10 9H8"></path>
                                <path d="M16 13H8"></path>
                                <path d="M16 17H8"></path>
                            </svg>
                            <span class="document-name">VCs attending Seattle event</span>
                            <span class="document-time">3d</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-text" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                            <span class="document-name">meeting_notes.txt</span>
                            <span class="document-time">5d</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-pdf" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-6-5z"/>
                                <path d="M14 2v5h5"/>
                                <path d="M9 13h6"/>
                                <path d="M9 17h3"/>
                            </svg>
                            <span class="document-name">Investment_Report_Q3.pdf</span>
                            <span class="document-time">2d</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Data Files sub-group -->
                <button class="group-button" style="margin-top: 12px;">
                    <svg class="icon chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                    <svg class="icon icon-csv" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                        <line x1="15" y1="3" x2="15" y2="21"></line>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="3" y1="15" x2="21" y2="15"></line>
                    </svg>
                    <span>Data Files</span>
                    <span class="count-badge">4</span>
                </button>

                <div class="document-list">
                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-csv" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="15" y1="3" x2="15" y2="21"></line>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="3" y1="15" x2="21" y2="15"></line>
                            </svg>
                            <span class="document-name">AMO_Seller_Insights___Scoring_Framework.csv</span>
                            <span class="document-time">Today</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-excel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #059669;">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <rect x="7" y="7" width="3" height="9"></rect>
                                <rect x="14" y="7" width="3" height="5"></rect>
                            </svg>
                            <span class="document-name">Q3_Financials_2024.xlsx</span>
                            <span class="document-time">1d</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-json" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                <polyline points="13 2 13 9 20 9"/>
                                <path d="M12 12h.01"/>
                                <path d="M12 17h.01"/>
                            </svg>
                            <span class="document-name">api_response_data.json</span>
                            <span class="document-time">3h</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Media Files sub-group -->
                <button class="group-button" style="margin-top: 12px;">
                    <svg class="icon chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                    <svg class="icon icon-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>Media Files</span>
                    <span class="count-badge">2</span>
                </button>

                <div class="document-list">
                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span class="document-name">product_mockup_v2.png</span>
                            <span class="document-time">4h</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span class="document-name">team_photo.jpg</span>
                            <span class="document-time">6d</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Code Files sub-group -->
                <button class="group-button" style="margin-top: 12px;">
                    <svg class="icon chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m6 9 6 6 6-6"></path>
                    </svg>
                    <svg class="icon icon-code" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #8b5cf6;">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <span>Code Files</span>
                    <span class="count-badge">2</span>
                </button>

                <div class="document-list">
                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-code" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="16 18 22 12 16 6"></polyline>
                                <polyline points="8 6 2 12 8 18"></polyline>
                            </svg>
                            <span class="document-name">data_analysis.py</span>
                            <span class="document-time">1h</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="document-wrapper" draggable="true">
                        <div class="document-connector"></div>
                        <div class="document-card">
                            <svg class="icon icon-code" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="16 18 22 12 16 6"></polyline>
                                <polyline points="8 6 2 12 8 18"></polyline>
                            </svg>
                            <span class="document-name">dashboard.js</span>
                            <span class="document-time">2h</span>
                            <button class="action-button edit-button" title="Edit title">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                                </svg>
                            </button>
                            <button class="action-button delete-button" title="Delete document">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    <line x1="10" x2="10" y1="11" y2="17"></line>
                                    <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Files section at bottom -->
                <div class="file-section">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">All Files</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        <button class="file-badge">
                            <span class="file-icon">📊</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">AMO_Seller_Insights.csv</span>
                        </button>
                        <button class="file-badge">
                            <span class="file-icon">📈</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">Q3_Financials.xlsx</span>
                        </button>
                        <button class="file-badge">
                            <span class="file-icon">📄</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">Investment_Report.pdf</span>
                        </button>
                        <button class="file-badge">
                            <span class="file-icon">🖼️</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">product_mockup.png</span>
                        </button>
                        <button class="file-badge">
                            <span class="file-icon">🔧</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">api_response.json</span>
                        </button>
                        <button class="file-badge">
                            <span class="file-icon">💻</span>
                            <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis;">data_analysis.py</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Icon Legend -->
        <div style="margin-top: 32px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
            <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--text-secondary);">File Type Icons Reference</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                        <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                        <path d="M10 9H8"></path>
                        <path d="M16 13H8"></path>
                        <path d="M16 17H8"></path>
                    </svg>
                    <span>Documents (gray)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                        <line x1="15" y1="3" x2="15" y2="21"></line>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="3" y1="15" x2="21" y2="15"></line>
                    </svg>
                    <span>CSV Files (green)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <rect x="7" y="7" width="3" height="9"></rect>
                        <rect x="14" y="7" width="3" height="5"></rect>
                    </svg>
                    <span>Excel Files (dark green)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-6-5z"/>
                        <path d="M14 2v5h5"/>
                        <path d="M9 13h6"/>
                        <path d="M9 17h3"/>
                    </svg>
                    <span>PDF Files (red)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>Image Files (blue)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                        <path d="M12 12h.01"/>
                        <path d="M12 17h.01"/>
                    </svg>
                    <span>JSON Files (orange)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <span>Code Files (purple)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span>Text Files (gray)</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>