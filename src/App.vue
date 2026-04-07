<template>
  <main v-if="ready" class="page-shell">
    <section class="hero panel">
      <div>
        <p class="eyebrow">sub2api 邀请返利</p>
        <h1>{{ isAdmin ? '邀请返利后台' : '邀请充值返利中心' }}</h1>
        <p class="hero__desc">
          {{
            isAdmin
              ? '管理员可查看邀请数据、配置多阶段充值返现比例。返现金额会自动发放到用户系统余额。'
              : '邀请用户充值后，系统会按阶段比例自动返现到你的系统余额。你可以看到邀请用户列表和每一笔返现明细。'
          }}
        </p>
      </div>
      <div class="hero__meta">
        <div class="meta-card">
          <span>{{ isAdmin ? '运行模式' : '邀请代码' }}</span>
          <strong>{{ isAdmin ? adminDashboard?.sync.mode : inviteDashboard?.inviteCode }}</strong>
        </div>
        <div class="meta-card">
          <span>{{ isAdmin ? '数据来源' : '来源系统' }}</span>
          <strong>{{ context.source }}</strong>
        </div>
      </div>
    </section>

    <template v-if="!isAdmin && inviteDashboard">
      <section class="stats-grid">
        <StatCard label="累计邀请" :value="String(inviteDashboard.stats.totalInvites)" hint="已绑定邀请关系的用户数" />
        <StatCard label="有效邀请" :value="String(inviteDashboard.stats.activeInvites)" hint="已产生充值的邀请用户" />
        <StatCard label="累计充值金额" :value="formatCurrency(inviteDashboard.stats.totalRechargeAmount)" hint="邀请用户累计充值金额" />
        <StatCard label="累计返现金额" :value="formatCurrency(inviteDashboard.stats.totalRewardAmount)" hint="自动返到系统余额" />
        <StatCard label="当前余额返现" :value="formatCurrency(inviteDashboard.stats.balanceRewardAmount)" hint="当前可用返利余额" />
        <StatCard label="转化率" :value="`${inviteDashboard.stats.conversionRate}%`" hint="有效邀请 / 总邀请" />
      </section>

      <section class="content-grid two-columns">
        <section class="panel invite-panel">
          <div class="panel__header">
            <h3>专属邀请链接</h3>
            <button class="action-btn" @click="copyInviteLink">复制链接</button>
          </div>
          <div class="invite-link-box">{{ inviteDashboard.inviteLink }}</div>
          <div class="qr-card" v-if="inviteDashboard.qrCodeDataUrl">
            <img :src="inviteDashboard.qrCodeDataUrl" alt="邀请二维码" class="qr-image" />
            <div>
              <strong>邀请二维码</strong>
              <p>用户扫码后可直接进入注册/充值流程，并自动绑定你的邀请关系。</p>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__header">
            <h3>多阶段返现比例</h3>
            <span>自动返到系统余额</span>
          </div>
          <div class="stage-list compact">
            <div class="stage-item" v-for="stage in inviteDashboard.rewardStages" :key="stage.id">
              <div>
                <strong>{{ stage.label }}</strong>
                <p>{{ stage.stageType }}</p>
              </div>
              <div class="stage-rate">{{ toPercent(stage.rate) }}</div>
            </div>
          </div>
          <div class="tips-list">
            <div class="tip-item" v-for="(text, index) in inviteDashboard.announcements" :key="index">{{ text }}</div>
          </div>
        </section>
      </section>

      <DataTable title="邀请用户列表" :columns="invitedUserColumns" :rows="invitedUserRows" />
      <DataTable title="返现明细" :columns="rewardColumns" :rows="rewardRows" />
    </template>

    <template v-else-if="isAdmin && adminDashboard">
      <section class="stats-grid">
        <StatCard label="邀请人数总计" :value="String(adminDashboard.summary.totalInvites)" hint="平台全部邀请用户数" />
        <StatCard label="参与推广用户" :value="String(adminDashboard.summary.totalUsers)" hint="有邀请数据的推广用户" />
        <StatCard label="累计充值金额" :value="formatCurrency(adminDashboard.summary.totalRechargeAmount)" hint="邀请订单累计充值" />
        <StatCard label="累计返现金额" :value="formatCurrency(adminDashboard.summary.totalRewardAmount)" hint="已自动发放总额" />
        <StatCard label="当前返利余额" :value="formatCurrency(adminDashboard.summary.balanceRewardAmount)" hint="用户系统余额中的返利" />
      </section>

      <section class="content-grid admin-grid">
        <section class="panel">
          <div class="panel__header">
            <h3>多阶段返现比例配置</h3>
            <button class="action-btn" @click="saveStages" :disabled="saving">{{ saving ? '保存中...' : '保存配置' }}</button>
          </div>
          <div class="stage-editor-list">
            <div class="stage-editor" v-for="stage in editableStages" :key="stage.id">
              <div class="stage-editor__head">
                <div>
                  <strong>{{ stage.label }}</strong>
                  <p>{{ stage.stageType }}</p>
                </div>
                <label class="switch-row">
                  <input type="checkbox" v-model="stage.enabled" />
                  <span>启用</span>
                </label>
              </div>
              <label class="field-label">
                返现比例
                <input class="input" type="number" min="0" max="100" step="0.1" :value="stage.rate * 100" @input="onRateInput(stage.id, $event)" />
              </label>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__header">
            <h3>数据同步 / 余额发放</h3>
            <span>{{ adminDashboard.sync.mode }}</span>
          </div>
          <div class="sync-box">
            <p>当前模式：<strong>{{ adminDashboard.sync.mode }}</strong></p>
            <p>最后同步：<strong>{{ adminDashboard.sync.lastSyncAt || '暂无' }}</strong></p>
            <div class="sync-actions">
              <input v-model="syncUserId" class="input" placeholder="输入 userId 触发同步" />
              <button class="action-btn secondary" @click="syncUser" :disabled="syncing">{{ syncing ? '同步中...' : '同步单个用户' }}</button>
            </div>
            <div class="sync-actions two-line">
              <input v-model="creditUserId" class="input" placeholder="发放余额的 userId" />
              <input v-model="creditAmount" class="input" placeholder="发放金额" />
              <button class="action-btn" @click="creditBalance" :disabled="crediting">{{ crediting ? '发放中...' : '测试发放余额' }}</button>
            </div>
            <div class="sync-actions triple-line">
              <input v-model="bindInviterUserId" class="input" placeholder="邀请人 userId" />
              <input v-model="bindInviteeUserId" class="input" placeholder="被邀请人 userId" />
              <input v-model="bindInviteeName" class="input" placeholder="被邀请人昵称" />
              <button class="action-btn secondary" @click="bindRelation" :disabled="binding">{{ binding ? '绑定中...' : '保存邀请绑定' }}</button>
            </div>
            <div class="sync-actions triple-line">
              <input v-model="callbackOrderNo" class="input" placeholder="订单号" />
              <input v-model="callbackInviteeUserId" class="input" placeholder="充值用户 userId" />
              <input v-model="callbackRechargeAmount" class="input" placeholder="充值金额" />
              <button class="action-btn secondary" @click="simulateRecharge" :disabled="callbacking">{{ callbacking ? '处理中...' : '模拟充值回调' }}</button>
            </div>
          </div>
        </section>
      </section>

      <DataTable title="推广用户总览" :columns="adminUserColumns" :rows="adminUserRows" />
    </template>
  </main>

  <main v-else class="loading-shell">
    <div class="panel loading-card">正在加载邀请返利系统...</div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  bindInviteRelation,
  creditUserBalance,
  fetchAdminDashboard,
  fetchInviteDashboard,
  submitRechargeCallback,
  syncAdminUser,
  updateRewardStages
} from './api/invite'
import DataTable from './components/DataTable.vue'
import StatCard from './components/StatCard.vue'
import type { AdminDashboard, InviteDashboard, RewardStage } from './types/invite'
import { applyTheme, getEmbeddedContext } from './utils/embedded'

const context = getEmbeddedContext()
const isAdmin = context.mode === 'admin'
const ready = ref(false)
const inviteDashboard = ref<InviteDashboard | null>(null)
const adminDashboard = ref<AdminDashboard | null>(null)
const editableStages = ref<RewardStage[]>([])
const saving = ref(false)
const syncing = ref(false)
const crediting = ref(false)
const binding = ref(false)
const callbacking = ref(false)
const syncUserId = ref(context.userId)
const creditUserId = ref(context.userId)
const creditAmount = ref('10')
const bindInviterUserId = ref('user_demo_001')
const bindInviteeUserId = ref('invitee_new_001')
const bindInviteeName = ref('新邀请用户')
const callbackOrderNo = ref(`ORDER-${Date.now()}`)
const callbackInviteeUserId = ref('invitee_new_001')
const callbackRechargeAmount = ref('99')

const invitedUserRows = computed<Array<Record<string, unknown>>>(() => {
  return inviteDashboard.value?.invitedUsers.map((item) => ({ ...item })) ?? []
})

const rewardRows = computed<Array<Record<string, unknown>>>(() => {
  return inviteDashboard.value?.rewardRecords.map((item) => ({ ...item })) ?? []
})

const adminUserRows = computed<Array<Record<string, unknown>>>(() => {
  return adminDashboard.value?.users.map((item) => ({ ...item })) ?? []
})

const invitedUserColumns = [
  { key: 'inviteeName', label: '邀请用户' },
  { key: 'inviteeUserId', label: '用户ID' },
  { key: 'joinedAt', label: '绑定时间' },
  { key: 'status', label: '状态', formatter: (value: unknown) => (value === 'active' ? '已充值' : '待转化') },
  { key: 'totalRechargeAmount', label: '累计充值', formatter: (value: unknown) => formatCurrency(Number(value || 0)) },
  { key: 'totalRewardAmount', label: '累计返现', formatter: (value: unknown) => formatCurrency(Number(value || 0)) }
]

const rewardColumns = [
  { key: 'inviteeName', label: '邀请用户' },
  { key: 'orderNo', label: '订单号' },
  { key: 'stageLabel', label: '返现阶段' },
  { key: 'rechargeAmount', label: '充值金额', formatter: (value: unknown) => formatCurrency(Number(value || 0)) },
  { key: 'rewardRate', label: '返现比例', formatter: (value: unknown) => toPercent(Number(value || 0)) },
  { key: 'rewardAmount', label: '返现金额', formatter: (value: unknown) => formatCurrency(Number(value || 0)) },
  { key: 'creditedTo', label: '发放去向' },
  { key: 'createdAt', label: '时间' }
]

const adminUserColumns = [
  { key: 'nickname', label: '昵称' },
  { key: 'userId', label: '用户ID' },
  { key: 'inviteCode', label: '邀请码' },
  { key: 'totalInvites', label: '邀请数' },
  { key: 'activeInvites', label: '有效邀请' },
  { key: 'totalRechargeAmount', label: '累计充值', formatter: (value: unknown) => formatCurrency(Number(value || 0)) },
  { key: 'totalRewardAmount', label: '累计返现', formatter: (value: unknown) => formatCurrency(Number(value || 0)) },
  { key: 'balanceRewardAmount', label: '余额返现', formatter: (value: unknown) => formatCurrency(Number(value || 0)) },
  { key: 'updatedAt', label: '更新时间' }
]

function formatCurrency(value: number) {
  return `¥ ${value.toFixed(2)}`
}

function toPercent(value: number) {
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
}

async function copyInviteLink() {
  if (!inviteDashboard.value) return
  try {
    await navigator.clipboard.writeText(inviteDashboard.value.inviteLink)
  } catch {
    window.prompt('复制邀请链接', inviteDashboard.value.inviteLink)
  }
}

function onRateInput(id: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = Math.max(0, Number(target.value || 0)) / 100
  const item = editableStages.value.find((stage) => stage.id === id)
  if (item) item.rate = value
}

async function loadUserDashboard() {
  const response = await fetchInviteDashboard(context.userId)
  inviteDashboard.value = response.data
}

async function loadAdminDashboard() {
  const response = await fetchAdminDashboard()
  adminDashboard.value = response.data
  editableStages.value = response.data.rewardStages.map((item) => ({ ...item }))
}

async function saveStages() {
  saving.value = true
  try {
    await updateRewardStages(editableStages.value)
    await loadAdminDashboard()
    alert('返现比例已保存')
  } catch (error) {
    alert(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function syncUser() {
  if (!syncUserId.value.trim()) return
  syncing.value = true
  try {
    await syncAdminUser(syncUserId.value.trim())
    await loadAdminDashboard()
    alert('同步完成')
  } catch (error) {
    alert(error instanceof Error ? error.message : '同步失败')
  } finally {
    syncing.value = false
  }
}

async function creditBalance() {
  const userId = creditUserId.value.trim()
  const amount = Number(creditAmount.value)
  if (!userId || amount <= 0) return
  crediting.value = true
  try {
    await creditUserBalance(userId, amount, 'invite cashback manual test')
    alert('余额发放请求已提交')
  } catch (error) {
    alert(error instanceof Error ? error.message : '余额发放失败')
  } finally {
    crediting.value = false
  }
}

async function bindRelation() {
  if (!bindInviterUserId.value.trim() || !bindInviteeUserId.value.trim()) return
  binding.value = true
  try {
    await bindInviteRelation(bindInviterUserId.value.trim(), bindInviteeUserId.value.trim(), bindInviteeName.value.trim())
    await loadAdminDashboard()
    alert('邀请关系已保存')
  } catch (error) {
    alert(error instanceof Error ? error.message : '绑定失败')
  } finally {
    binding.value = false
  }
}

async function simulateRecharge() {
  const orderNo = callbackOrderNo.value.trim()
  const inviteeUserId = callbackInviteeUserId.value.trim()
  const rechargeAmount = Number(callbackRechargeAmount.value)
  if (!orderNo || !inviteeUserId || rechargeAmount <= 0) return
  callbacking.value = true
  try {
    await submitRechargeCallback(orderNo, inviteeUserId, rechargeAmount)
    await loadAdminDashboard()
    alert('充值回调已处理')
  } catch (error) {
    alert(error instanceof Error ? error.message : '回调处理失败')
  } finally {
    callbacking.value = false
  }
}

onMounted(async () => {
  applyTheme(context.theme)
  if (isAdmin) {
    await loadAdminDashboard()
  } else {
    await loadUserDashboard()
  }
  ready.value = true
})
</script>
