'use client';
import { setLangAction } from './actions';

const LANGS = [{ k: 'th', l: 'TH' }, { k: 'en', l: 'EN' }, { k: 'zh', l: '中' }];

export default function LangSwitch({ cur }: { cur: string }) {
  return (
    <div className="langsw">
      {LANGS.map((l) => (
        <form key={l.k} action={setLangAction.bind(null, l.k)}>
          <button type="submit" className={cur === l.k ? 'on' : ''}>{l.l}</button>
        </form>
      ))}
    </div>
  );
}
