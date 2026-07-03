package com.closehousie.di

import android.content.Context
import com.closehousie.data.network.NetworkManager
import com.closehousie.domain.GameEngine
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Singleton
    @Provides
    fun provideNetworkManager(
        @ApplicationContext context: Context
    ): NetworkManager = NetworkManager(context)

    @Singleton
    @Provides
    fun provideGameEngine(): GameEngine = GameEngine()
}
