import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { getSets } from '../../api/sets';
import { incrementCard } from '../../api/inventory';
import { SWUButton } from '../../components/SWUButton';
import { AddCardsSetBar } from './AddCardsSetBar';
import { AddCardsKeypad } from './AddCardsKeypad';
import { AddCardsVerification } from './AddCardsVerification';
import { resolveRow, inventoryStatus, splitForVerification } from '../../utils/addCardsResolver';
import type { Row } from '../../utils/addCardsResolver';
import type { CardWithQty } from '../../api/inventory';
import type { CardSet } from '../../api/sets';
import './AddCardsModal.css';

type Phase = 'editing' | 'verification';

interface ModalState {
  setCode: string | null;
  rows: Row[];
  phase: Phase;
}

let _rowCounter = 0;
function emptyRow(): Row {
  _rowCounter += 1;
  return { id: `r${Date.now()}_${_rowCounter}`, cardNumber: '', op: false, variant: null };
}

interface Props {
  catalog: CardWithQty[];
  onClose: () => void;
  onCommitted: () => void;
}

export function AddCardsModal({ catalog, onClose, onCommitted }: Props) {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [state, setState] = useState<ModalState>({
    setCode: null,
    rows: [emptyRow()],
    phase: 'editing',
  });
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    getSets().then(setSets).catch(console.error);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeSet = sets.find(s => s.code === state.setCode);
  const hasUniqueVariantNumbers = activeSet?.has_unique_variant_numbers ?? false;

  const setSet = useCallback((code: string) => {
    setState(s => ({ ...s, setCode: code, rows: [emptyRow()], phase: 'editing' }));
  }, []);

  const changeSet = useCallback(() => {
    setState(s => ({ ...s, setCode: null, rows: [emptyRow()], phase: 'editing' }));
  }, []);

  const appendRow = useCallback((rowData: Omit<Row, 'id'>) => {
    setState(s => {
      const next: Row = { ...emptyRow(), ...rowData };
      const trimmed = [...s.rows];
      while (trimmed.length && !trimmed[trimmed.length - 1].cardNumber) trimmed.pop();
      return { ...s, rows: [...trimmed, next] };
    });
  }, []);

  const deleteRow = useCallback((id: string) => {
    setState(s => {
      const remaining = s.rows.filter(r => r.id !== id);
      return { ...s, rows: remaining.length ? remaining : [emptyRow()] };
    });
  }, []);

  const submit = useCallback(() => {
    setState(s => ({ ...s, phase: 'verification' }));
  }, []);

  const backToEditing = useCallback(() => {
    setState(s => ({ ...s, phase: 'editing' }));
  }, []);

  const { canSubmit, hasErrors, willAdd, willSkip } = useMemo(() => {
    if (!state.setCode) {
      return { canSubmit: false, hasErrors: false, willAdd: [], willSkip: [] };
    }

    const resolutions = state.rows.map(r =>
      resolveRow(state.setCode!, r, catalog, hasUniqueVariantNumbers),
    );

    const resolvedRows = resolutions.filter(r => r.status === 'resolved');
    const hasErrors = resolutions.some(r => r.status === 'error');
    const hasPending = resolutions.some(r => r.status === 'needs_variant');
    const canSubmit = resolvedRows.length > 0 && !hasErrors && !hasPending;

    const { willAdd, willSkip } = splitForVerification(
      state.setCode!,
      state.rows,
      catalog,
      hasUniqueVariantNumbers,
    );

    return { canSubmit, hasErrors, willAdd, willSkip };
  }, [state, catalog, hasUniqueVariantNumbers]);

  const hintText = useMemo((): string => {
    if (!state.setCode) return 'Select a set above to enable entry.';
    if (hasErrors) return 'Resolve the error above to continue.';
    if (canSubmit) {
      const count = state.rows.filter(r => r.cardNumber).length;
      return `${count} ${count === 1 ? 'card' : 'cards'} ready to add.`;
    }
    return 'Enter a card number to begin.';
  }, [state.setCode, state.rows, hasErrors, canSubmit]);

  async function handleCommit() {
    if (willAdd.length === 0 || committing) return;
    setCommitting(true);
    try {
      for (const { resolved } of willAdd) {
        await incrementCard(resolved.cardId);
      }
    } catch (err) {
      console.error('Commit failed:', err);
    } finally {
      setCommitting(false);
    }
    onCommitted();
    onClose();
  }

  const totalResolved = willAdd.length + willSkip.length;

  return (
    <div
      className="ac-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-title">
        <div className="ac-modal__head">
          <div>
            <h2 className="ac-modal__title" id="ac-title">
              {state.phase === 'verification' ? 'Verify cards to add' : 'Add cards'}
            </h2>
            <div className="ac-modal__subtitle">
              {state.phase === 'verification'
                ? "Review which cards will and won't be added before committing to inventory."
                : 'Enter cards to add to inventory. Tab between fields — no need for the mouse.'}
            </div>
          </div>
          <button
            type="button"
            className="ac-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <AddCardsSetBar
          sets={sets}
          setCode={state.setCode}
          onChoose={setSet}
          onChangeSet={changeSet}
        />

        <div className="ac-modal__body">
          {state.phase === 'editing' && state.setCode && (
            <AddCardsKeypad
              setCode={state.setCode}
              rows={state.rows}
              hasUniqueVariantNumbers={hasUniqueVariantNumbers}
              catalog={catalog}
              onAppendRow={appendRow}
              onDeleteRow={deleteRow}
            />
          )}
          {state.phase === 'verification' && (
            <AddCardsVerification willAdd={willAdd} willSkip={willSkip} />
          )}
        </div>

        <div className="ac-modal__foot">
          {state.phase === 'editing' ? (
            <>
              <span className="ac-modal__foot-hint">{hintText}</span>
              <span className="ac-modal__foot-spacer" />
              <SWUButton size="sm" onClick={onClose}>Cancel</SWUButton>
              <SWUButton
                size="sm"
                active={canSubmit}
                onClick={canSubmit ? submit : undefined}
              >
                Add Cards to Inventory
              </SWUButton>
            </>
          ) : (
            <>
              <span className="ac-modal__foot-hint">
                {willAdd.length} of {totalResolved} cards will be added.
              </span>
              <span className="ac-modal__foot-spacer" />
              <SWUButton size="sm" onClick={backToEditing}>Edit</SWUButton>
              <SWUButton size="sm" onClick={onClose}>Cancel</SWUButton>
              <SWUButton
                size="sm"
                active={willAdd.length > 0 && !committing}
                onClick={willAdd.length > 0 && !committing ? handleCommit : undefined}
              >
                Add Cards to Inventory
              </SWUButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
