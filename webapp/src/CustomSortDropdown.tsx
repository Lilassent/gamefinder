import React, { useState } from "react";
import arrowDown from "./assets/slim-arrow-down.png";
import arrowUp from "./assets/slim-arrow-up.png";
import "./CustomSortDropdown.css";

const options = [
  { label: "Relevance", value: "relevance" },
  { label: "Name", value: "name" },
  { label: "Release Date", value: "released" },
];

export const CustomSortDropdown = ({
  value = "relevance",
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const current = options.find((opt) => opt.value === value);

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="dropdown-full-wrapper">
      <span className="dropdown-label">Sort by:</span>
      <div className="dropdown-toggle" onClick={toggleOpen}>
        <span className="selected-option">{current?.label}</span>
        <img src={isOpen ? arrowUp : arrowDown} className="dropdown-arrow" />
      </div>

      {isOpen && (
        <ul className="dropdown-menu">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={opt.value === value ? "active" : ""}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
