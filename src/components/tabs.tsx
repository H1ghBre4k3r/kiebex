"use client";

import { useState } from "react";
import styles from "./tabs.module.css";

type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabList} aria-label="Tabbed navigation" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          className={styles.tabPanel}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
        >
          {activeTab === tab.id && tab.content}
        </div>
      ))}
    </div>
  );
}
