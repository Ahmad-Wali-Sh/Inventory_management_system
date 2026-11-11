// Single-value searchable select for choosing from fixed options.
import { useId, useState } from 'react';

export default function SearchableSelect({
  options,
  value,
  onChange,
  onBlur,
  inputRef,
  ariaLabel,
  searchLabel,
  noResultsLabel,
}) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedOption = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) => (
    (!query || option.value !== '') && option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  ));

  const chooseOption = (option) => {
    onChange(option.value);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative mt-1">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        className="input"
        placeholder={isOpen ? searchLabel : '—'}
        value={isOpen ? query : selectedOption?.label ?? ''}
        onFocus={() => {
          setQuery('');
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onBlur={() => {
          setQuery('');
          setIsOpen(false);
          setActiveIndex(-1);
          onBlur();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setQuery('');
            setIsOpen(false);
            setActiveIndex(-1);
          } else if (event.key === 'ArrowDown' && isOpen) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
          } else if (event.key === 'ArrowUp' && isOpen) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && isOpen) {
            event.preventDefault();
            const option = filteredOptions[activeIndex];
            if (option) chooseOption(option);
          }
        }}
      />
      {isOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={option.value}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={String(option.value) === String(value)}
              className={`block w-full px-3 py-2 text-start text-sm text-fg hover:bg-muted ${
                index === activeIndex ? 'bg-muted' : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-fg-muted">{noResultsLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
