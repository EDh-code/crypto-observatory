import {test} from 'node:test';import assert from 'node:assert/strict';import {change,drawdown,periodReturn} from '../site/math.mjs';
test('change uses calendar days and does not substitute missing observations',()=>{assert.equal(change([['2025-01-01',100],['2025-01-31',150]],30),50);assert.equal(change([['2025-01-02',100],['2025-01-31',150]],30),null);assert.equal(change([['2025-01-01',0],['2025-01-31',150]],30),null)});
test('drawdown follows running high, including recovery',()=>{assert.deepEqual(drawdown([['a',100],['b',50],['c',200]]).map(p=>p[1]),[0,-50,0])});
test('returns require full 365-day history',()=>{assert.deepEqual(periodReturn([['2024-01-01',100],['2024-12-31',120]],365),[['2024-12-31',19.999999999999996]]);assert.deepEqual(periodReturn([['2024-01-01',100]],365),[])});
