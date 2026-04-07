<template>
  <main class="page-shell" v-if="dashboard">
    <section class="hero panel">
      <div>
        <p class="eyebrow">邀请返利</p>
        <h1>邀请好友注册，持续获得返利奖励</h1>
        <p class="hero__desc">
          当前页面以嵌入模式运行，可直接接收 sub2api 透传的用户身份、主题与语言参数。
          现在是前端独立版，后续只需要把 mock API 换成真实接口即可上线。
        </p>
      </div>
      <div class="hero__meta">
        <div class="meta-card">
          <span>邀请代码</span>
          <strong>{{ dashboard.inviteCode }}</strong>
        </div>
        <div class="meta-card">
          <span>来源系统</span>
          <strong>{{ context.source }}</strong>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <StatCard label="累计邀请" :value="String(dashboard.stats.totalInvites)" hint="已注册好友总数" />
      <StatCard label="有效邀请" :value="String(dashboard.stats.effectiveInvites)" hint="已产生有效订单" />
      <StatCard label="累计返利" :value="formatCurrency(dashboard.stats.totalReward)" hint="历史已累计返利金额" />
      <StatCard label="待结算返利" :value="formatCurrency(dashboard.stats.pendingReward)" hint="满足条件后自动结算" />
    </section>

    <section class="content-grid">
      <section class="panel invite-panel">
        <div class="panel__header">
          <h3>专属邀请链接</h3>
          <button class="action-btn" @click="copyInviteLink">复制链接</button>
        </div>
        <div class="invite-link-box">{{ dashboard.inviteLink }}</div>
        <div class="tips-list">
          <div class="tip-item">• 新用户通过你的链接注册后，将自动绑定邀请关系</div>
          <div class="tip-item">• 好友完成首充、续费或购买套餐后，可按规则获得返利</div>
          <div class="tip-item">• 返利规则、比例和结算条件可在后端接口中配置</div>
        </div>
      </section>

      <section class="panel rule-panel">
        <div class="panel__header">
          <h3>返利说明</h3>
        </div>
        <div class="rule-list">
          <div class="rule-item">
            <strong>首充返利</strong>
            <span>好友首笔有效支付完成后，按设定比例发放奖励。</span>
          </div>
          <div class="rule-item">
            <strong>续费返利</strong>
            <span>好友后续订单也可继续累计返利，适合长期增长。</span>
          </div>
          <div class="rule-item">
            <strong>风控预留</strong>
            <span>当前结构已预留状态字段，可接入待审核、冻结、已结算等真实状态。</span>
          </div>
        </div>
      </section>
    </section>

    <DataTable title="邀请记录" :columns="inviteColumns" :rows="inviteRows" />

    <DataTable title="返利记录" :columns="rewardColumns" :rows="rewardRows" />
  </main>

  <main v-else class="loading-shell">
    <div class="panel loading-card">正在加载邀请返利数据...</div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchInviteDashboard } from './api/invite'
import DataTable from './components/DataTable.vue'
import StatCard from './components/StatCard.vue'
import type { InviteDashboard } from './types/invite'
import { applyTheme, getEmbeddedContext } from './utils/embedded'

const context = getEmbeddedContext()
const dashboard = ref<InviteDashboard | null>(null)

const inviteRows = computed<Array<Record<string, unknown>>>(() => {
  return dashboard.value?.inviteRecords.map((item) => ({ ...item })) ?? []
})

const rewardRows = computed<Array<Record<string, unknown>>>(() => {
  return dashboard.value?.rewardRecords.map((item) => ({ ...item })) ?? []
})

const inviteColumns = [
  { key: 'userName', label: '用户' },
  { key: 'joinedAt', label: '注册时间' },
  { key: 'status', label: '状态', formatter: (value: unknown) => formatInviteStatus(String(value ?? '')) },
  { key: 'contribution', label: '贡献金额', formatter: (value: unknown) => formatCurrency(Number(value ?? 0)) }
]

const rewardColumns = [
  { key: 'type', label: '返利类型' },
  { key: 'amount', label: '金额', formatter: (value: unknown) => formatCurrency(Number(value ?? 0)) },
  { key: 'status', label: '状态', formatter: (value: unknown) => formatRewardStatus(String(value ?? '')) },
  { key: 'createdAt', label: '创建时间' },
  { key: 'note', label: '备注' }
]

function formatCurrency(value: number) {
  return `¥ ${value.toFixed(2)}`
}

function formatInviteStatus(value: string) {
  return value === 'effective' ? '有效' : '待转化'
}

function formatRewardStatus(value: string) {
  return value === 'settled' ? '已结算' : '待结算'
}

async function copyInviteLink() {
  if (!dashboard.value) return
  try {
    await navigator.clipboard.writeText(dashboard.value.inviteLink)
  } catch {
    window.prompt('复制邀请链接', dashboard.value.inviteLink)
  }
}

onMounted(async () => {
  applyTheme(context.theme)
  dashboard.value = await fetchInviteDashboard(context)
})
</script>
