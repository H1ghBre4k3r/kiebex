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
      <nav className={styles.tabList} aria-label="Tabbed navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className={styles.tabPanel} role="tabpanel">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
