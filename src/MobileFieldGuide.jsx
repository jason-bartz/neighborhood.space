import React, { useState, useEffect, useRef } from "react";
import { sections, topics, searchContent } from "./data/fieldGuideContent";
import "./App.css";

// Constants
const MISSING_CONTENT_NOTICE = `Note: The mobile version contains the same core content as the desktop version, 
but the desktop version includes additional hyperlinks and citations that enhance the reading experience.
For a complete experience with all references, please view on a larger screen.`;

export default function MobileFieldGuide({ onClose }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  
  const contentRef = useRef(null);
  const sectionRefs = useRef({});
  
  // Register section refs for scrolling
  useEffect(() => {
    sections.forEach(section => {
      sectionRefs.current[section.id] = React.createRef();
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          sectionRefs.current[`${section.id}-${subsection.id}`] = React.createRef();
        });
      }
    });
  }, []);
  
  // Auto-close search results when query is empty
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    } else {
      const results = searchContent(searchQuery);
      setSearchResults(results);
    }
  }, [searchQuery]);
  
  // Scroll to active section if set
  useEffect(() => {
    if (activeSection && sectionRefs.current[activeSection]) {
      const ref = sectionRefs.current[activeSection];
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeSection]);
  
  // Filter sections by topic if a topic is selected
  const filteredSections = activeTopic 
    ? sections.filter(section => section.topics?.includes(activeTopic))
    : sections;
  
  // Handle navigation to a section or subsection
  const navigateToSection = (sectionId, subsectionId = null) => {
    const targetId = subsectionId ? `${sectionId}-${subsectionId}` : sectionId;
    setActiveSection(targetId);
    setIsSidebarOpen(false);
  };
  
  // Handle search result navigation
  const navigateToSearchResult = (result) => {
    if (result.type === 'subsection') {
      navigateToSection(result.parentId, result.id);
    } else {
      navigateToSection(result.id);
    }
    setSearchQuery('');
    setSearchResults([]);
  };
  
  return (
    <div style={{
      minHeight: "100vh",
      background: "url('/assets/gnf-wallpaper-blue.webp')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      padding: "10px",
      fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Main container with titlebar */}
      <div style={{
        background: "white",
        border: "2px solid #d48fc7",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flex: 1
      }}>
        {/* Window Title Bar */}
        <div style={{
          background: "#ffeaf5",
          borderBottom: "1px solid #d48fc7",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                padding: "0 5px"
              }}
            >
              ☰
            </button>
            <span>📘 Founder's Field Guide</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#ffbde2",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "0 8px",
              height: "24px",
              lineHeight: "24px",
              fontSize: "16px"
            }}
          >
            ✖
          </button>
        </div>
        
        {/* Search and Topic Navigation */}
        <div style={{
          padding: "10px",
          borderBottom: "1px solid #eee",
          background: "#f8f8f8"
        }}>
          {/* Search */}
          <div style={{
            position: "relative",
            marginBottom: "10px"
          }}>
            <input
              type="text"
              placeholder="Search the guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                paddingLeft: "32px",
                borderRadius: "20px",
                border: "1px solid #ddd",
                fontSize: "14px",
                fontFamily: "inherit"
              }}
            />
            <span style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "16px"
            }}>
              🔍
            </span>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                zIndex: 10,
                maxHeight: "200px",
                overflowY: "auto"
              }}>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => navigateToSearchResult(result)}
                    style={{
                      padding: "8px 12px",
                      borderBottom: index < searchResults.length - 1 ? "1px solid #eee" : "none",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    {result.type === 'subsection' && '↳ '}
                    {result.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Topic Pills */}
          <div style={{
            display: "flex",
            overflowX: "auto",
            gap: "8px",
            padding: "5px 0",
            scrollbarWidth: "none", // Hide scrollbar in Firefox
            msOverflowStyle: "none", // Hide scrollbar in IE/Edge
            WebkitOverflowScrolling: "touch" // Smooth scrolling on iOS
          }}>
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(activeTopic === topic.id ? null : topic.id)}
                style={{
                  background: activeTopic === topic.id ? "#FFD6EC" : "white",
                  border: "1px solid #ddd",
                  borderRadius: "20px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: activeTopic === topic.id ? "bold" : "normal",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                {topic.emoji} {topic.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Flex container for sidebar and content */}
        <div style={{ 
          display: "flex", 
          flex: 1,
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Sidebar - Absolutely positioned when open on mobile */}
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: isSidebarOpen ? 0 : "-85%",
            width: "85%",
            background: "white",
            zIndex: 100,
            borderRight: "1px solid #ddd",
            transition: "left 0.3s ease",
            overflowY: "auto"
          }}>
            <div style={{ padding: "15px" }}>
              <h3 style={{ 
                fontSize: "16px", 
                marginTop: 0, 
                marginBottom: "15px",
                borderBottom: "2px solid #FFD6EC",
                paddingBottom: "5px"
              }}>
                Table of Contents
              </h3>
              
              <div>
                {sections.map(section => (
                  <div key={section.id} style={{ marginBottom: "15px" }}>
                    <div 
                      onClick={() => navigateToSection(section.id)}
                      style={{
                        padding: "8px 10px",
                        background: "transparent",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      {section.title}
                    </div>
                    
                    {/* Subsections - always show for better navigation */}
                    {section.subsections && (
                      <div style={{ marginLeft: "15px", marginTop: "5px" }}>
                        {section.subsections.map(subsection => (
                          <div
                            key={subsection.id}
                            onClick={() => navigateToSection(section.id, subsection.id)}
                            style={{
                              padding: "6px 10px",
                              marginBottom: "2px",
                              background: "transparent",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px"
                            }}
                          >
                            ↳ {subsection.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Overlay when sidebar is open */}
          {isSidebarOpen && (
            <div 
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 50
              }}
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          {/* Main Content */}
          <div 
            ref={contentRef}
            style={{
              flex: 1,
              padding: "15px",
              overflowY: "auto"
            }}
          >
            {/* Content Container with max-width for readability */}
            <div style={{
              maxWidth: "700px",
              margin: "0 auto",
              padding: "0 15px"
            }}>
              {/* Title */}
              <h1 style={{ 
                fontSize: "26px", 
                marginBottom: "20px", 
                textAlign: "center",
                color: "#333"
              }}>
                Founder's Field Guide: From Idea to Early Growth
              </h1>
              
              {/* Introduction */}
              <p style={{ 
                fontSize: "15px", 
                lineHeight: "1.6", 
                marginBottom: "25px",
                color: "#444"
              }}>
                Starting a business is an exciting journey that spans from the spark of an idea to building a viable, growing company. This field guide is organized into modular sections to help first-time U.S. entrepreneurs navigate each stage, with plain-language advice, frameworks, and checklists along the way.
              </p>
              
              {/* Notice about hyperlinks and references */}
              <div style={{
                marginBottom: "20px",
                padding: "15px",
                backgroundColor: "#f8f8f8",
                borderRadius: "8px",
                borderLeft: "3px solid #FFD6EC",
              }}>
                <p style={{ 
                  fontSize: "14px", 
                  lineHeight: "1.5",
                  color: "#666"
                }}>
                  <strong>Note:</strong> This mobile guide now includes all sections from the desktop version, 
                  but hyperlinks and citations from the original are not included in the mobile version.
                  For the complete experience with all references, please view on a larger screen.
                </p>
              </div>
              
              {/* Render sections */}
              {filteredSections.map((section, index) => (
                <div 
                  key={section.id} 
                  ref={sectionRefs.current[section.id]}
                  id={section.id}
                  style={{ 
                    marginBottom: "40px",
                    scrollMarginTop: "20px" 
                  }}
                >
                  <h2 style={{ 
                    fontSize: "24px", 
                    marginBottom: "15px",
                    color: "#444",
                    borderBottom: "2px solid #FFD6EC",
                    paddingBottom: "5px"
                  }}>
                    {section.title}
                  </h2>
                  
                  <div style={{ marginBottom: "20px" }}>
                    {section.content.map((paragraph, pIndex) => (
                      <p 
                        key={`p-${pIndex}`} 
                        style={{ 
                          fontSize: "15px", 
                          lineHeight: "1.6", 
                          marginBottom: "15px",
                          color: "#333"
                        }}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  
                  {section.subsections && section.subsections.map((subsection) => (
                    <div 
                      key={subsection.id} 
                      ref={sectionRefs.current[`${section.id}-${subsection.id}`]}
                      id={`${section.id}-${subsection.id}`}
                      style={{ 
                        marginBottom: "25px", 
                        marginLeft: "15px",
                        scrollMarginTop: "20px" 
                      }}
                    >
                      <h3 style={{ 
                        fontSize: "18px", 
                        marginBottom: "10px",
                        color: "#444",
                        borderLeft: "3px solid #FFD6EC",
                        paddingLeft: "10px"
                      }}>
                        {subsection.title}
                      </h3>
                      
                      <div>
                        {subsection.content.map((paragraph, pIndex) => (
                          <p 
                            key={`sp-${pIndex}`} 
                            style={{ 
                              fontSize: "15px", 
                              lineHeight: "1.6", 
                              marginBottom: "15px",
                              color: "#333" 
                            }}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Section divider - except for last section */}
                  {index < filteredSections.length - 1 && (
                    <div style={{ 
                      height: "1px", 
                      background: "#ddd", 
                      margin: "30px 0" 
                    }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}